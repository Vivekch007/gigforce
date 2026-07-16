package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.AmendmentRequestDTO;
import com.gigforce.assignment.dto.AmendmentResponseDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.AssignmentAmendment;
import com.gigforce.assignment.enums.AmendmentStatus;
import com.gigforce.assignment.enums.AmendmentType;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.repository.AssignmentAmendmentRepository;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.AmendmentNotFoundException;
import com.gigforce.exception.AssignmentNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

import com.gigforce.notification.service.NotificationService;
import com.gigforce.notification.dto.NotificationRequestDTO;

@Service
@Transactional(readOnly = true)
public class AssignmentAmendmentServiceImpl implements AssignmentAmendmentService {

    private final AssignmentAmendmentRepository amendmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final ContractorProfileRepository contractorProfileRepository;
    private final EngagementHistoryRepository engagementHistoryRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public AssignmentAmendmentServiceImpl(
            AssignmentAmendmentRepository amendmentRepository,
            AssignmentRepository assignmentRepository,
            ContractorProfileRepository contractorProfileRepository,
            EngagementHistoryRepository engagementHistoryRepository,
            UserRepository userRepository,
            AuditService auditService,
            NotificationService notificationService) {
        this.amendmentRepository = amendmentRepository;
        this.assignmentRepository = assignmentRepository;
        this.contractorProfileRepository = contractorProfileRepository;
        this.engagementHistoryRepository = engagementHistoryRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public AmendmentResponseDTO createAmendment(String assignmentId, AmendmentRequestDTO request) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + assignmentId));

        if (assignment.getStatus() == AssignmentStatus.COMPLETED
                || assignment.getStatus() == AssignmentStatus.TERMINATED_EARLY) {
            throw new IllegalArgumentException("Cannot request amendments on completed or terminated assignments.");
        }

        // Validate values based on amendment type
        switch (request.getAmendmentType()) {
            case EXTENSION:
                try {
                    LocalDate extensionDate = LocalDate.parse(request.getNewValue());
                    if (!extensionDate.isAfter(assignment.getEndDate())) {
                        throw new IllegalArgumentException(
                                "Extension date must be after the current assignment end date.");
                    }
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("New value must be a valid date (YYYY-MM-DD) for extension.");
                }
                break;

            case RATE_REVISION:
                try {
                    BigDecimal newRate = new BigDecimal(request.getNewValue());
                    if (newRate.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("Rate must be a positive decimal.");
                    }
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("New value must be a valid decimal number for rate revision.");
                }
                break;

            case EARLY_TERMINATION:
                try {
                    LocalDate termDate = LocalDate.parse(request.getNewValue());
                    if (termDate.isBefore(assignment.getStartDate()) || !termDate.isBefore(assignment.getEndDate())) {
                        throw new IllegalArgumentException(
                                "Termination date must be between assignment start date and end date.");
                    }
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException(
                            "New value must be a valid date (YYYY-MM-DD) for early termination.");
                }
                break;

            case SCOPE_CHANGE:
                if (request.getNewValue() == null || request.getNewValue().trim().isEmpty()) {
                    throw new IllegalArgumentException("Scope change details must not be empty.");
                }
                break;
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // Amendments are raised by the vendor assigned to this assignment (or an admin).
        // Hiring managers approve amendments; they do not raise them.
        String role = currentUser.getRole().name();
        boolean isAdmin = role.equals("ADMIN");
        boolean isAssignmentVendor = (role.equals("VENDOR") || role.equals("VENDOR_MANAGER"))
                && assignment.getVendor() != null
                && assignment.getVendor().getId().equals(currentUser.getId());
        if (!isAdmin && !isAssignmentVendor) {
            throw new AccessDeniedException(
                    "Access Denied: Only the assigned vendor (or an admin) can request amendments for this assignment.");
        }

        AssignmentAmendment amendment = AssignmentAmendment.builder()
                .assignment(assignment)
                .amendmentType(request.getAmendmentType())
                .effectiveDate(request.getEffectiveDate())
                .newValue(request.getNewValue().trim())
                .status(AmendmentStatus.PENDING)
                .remarks(request.getRemarks() != null ? request.getRemarks().trim() : null)
                .build();

        AssignmentAmendment saved = amendmentRepository.save(amendment);

        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_AMENDMENT_CREATED",
                "AssignmentAmendment",
                saved.getId(),
                String.format("Amendment request '%s' submitted for Assignment %s", request.getAmendmentType(),
                        assignment.getId()));

        return toDto(saved);
    }

    @Override
    @Transactional
    public AmendmentResponseDTO approveAmendment(String id, String remarks) {
        AssignmentAmendment amendment = amendmentRepository.findById(id)
                .orElseThrow(() -> new AmendmentNotFoundException("Amendment not found with ID: " + id));

        if (amendment.getStatus() != AmendmentStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Amendment is already resolved (Status: " + amendment.getStatus() + ").");
        }

        Assignment assignment = amendment.getAssignment();

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // Security check: only the assignment's hiring manager or an admin can approve.
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isHiringManager = assignment.getHiringManager().getId().equals(currentUser.getId());
        if (!isAdmin && !isHiringManager) {
            throw new AccessDeniedException(
                    "Access Denied: Only the hiring manager or an admin can approve amendments.");
        }

        // Apply amendment to assignment
        switch (amendment.getAmendmentType()) {
            case EXTENSION:
                LocalDate extensionDate = LocalDate.parse(amendment.getNewValue());
                assignment.setEndDate(extensionDate);
                assignment.setStatus(AssignmentStatus.EXTENDED);
                break;

            case RATE_REVISION:
                BigDecimal newRate = new BigDecimal(amendment.getNewValue());
                assignment.setAgreedRatePerDay(newRate);
                break;

            case SCOPE_CHANGE:
                assignment.setSowReference(amendment.getNewValue());
                break;

            case EARLY_TERMINATION:
                LocalDate termDate = LocalDate.parse(amendment.getNewValue());
                assignment.setEndDate(termDate);
                assignment.setStatus(AssignmentStatus.TERMINATED_EARLY);

                // Release Contractor (set availability)
                ContractorProfile profile = assignment.getContractorProfile();
                profile.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
                contractorProfileRepository.save(profile);

                auditService.logAction(
                        currentUser.getId(),
                        "CONTRACTOR_PROFILE_UPDATED",
                        "ContractorProfile",
                        profile.getId(),
                        String.format("Contractor status changed to AVAILABLE on early assignment termination by %s",
                                currentUser.getEmail()));

                // Record Engagement History
                EngagementHistory engagement = EngagementHistory.builder()
                        .contractorProfile(profile)
                        .clientName(assignment.getRequisition() != null
                                ? "Client Requisition ID: " + assignment.getRequisition().getId()
                                : "Client Name")
                        .roleTitle(assignment.getRequisition() != null ? assignment.getRequisition().getTitle()
                                : "Contractor Placement")
                        .startDate(assignment.getStartDate())
                        .endDate(termDate)
                        .build();
                engagementHistoryRepository.save(engagement);

                auditService.logAction(
                        currentUser.getId(),
                        "CONTRACTOR_ENGAGEMENT_CREATED",
                        "ContractorProfile",
                        profile.getId(),
                        String.format("Engagement history placement recorded for contractor %s on early termination",
                                profile.getUser().getEmail()));
                break;
        }

        assignmentRepository.save(assignment);

        amendment.setStatus(AmendmentStatus.APPROVED);
        amendment.setApprovedBy(currentUser);
        if (remarks != null) {
            amendment.setRemarks(remarks.trim());
        }
        AssignmentAmendment saved = amendmentRepository.save(amendment);

        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_AMENDMENT_APPROVED",
                "AssignmentAmendment",
                saved.getId(),
                String.format("Amendment approved: %s for Assignment %s", amendment.getAmendmentType(),
                        assignment.getId()));

        // Reject conflicting pending requests
        List<AssignmentAmendment> conflicting = amendmentRepository.findByAssignmentIdAndStatus(assignment.getId(),
                AmendmentStatus.PENDING);
        for (AssignmentAmendment conf : conflicting) {
            if (conf.getId().equals(amendment.getId()))
                continue;
            if (conf.getAmendmentType() == amendment.getAmendmentType()) {
                conf.setStatus(AmendmentStatus.REJECTED);
                conf.setRemarks("Auto-rejected due to approval of amendment ID: " + amendment.getId());
                amendmentRepository.save(conf);

                auditService.logAction(
                        currentUser.getId(),
                        "ASSIGNMENT_AMENDMENT_REJECTED",
                        "AssignmentAmendment",
                        conf.getId(),
                        "Auto-rejected pending amendment of same type due to approval of amendment ID: "
                                + amendment.getId());
            }
        }

        // Trigger alerts on extension or early termination
        if (saved.getAmendmentType() == AmendmentType.EXTENSION) {
            if (assignment.getContractorProfile() != null && assignment.getContractorProfile().getUser() != null) {
                notificationService.createNotification(NotificationRequestDTO.builder()
                        .userId(assignment.getContractorProfile().getUser().getId())
                        .message(String.format("Your assignment %s extension has been approved.", assignment.getId()))
                        .category("ASSIGNMENT")
                        .notificationType("ASSIGNMENT_EXTENSION")
                        .referenceEntityId(assignment.getId())
                        .referenceEntityType("Assignment")
                        .build());
            }
            if (assignment.getVendor() != null) {
                notificationService.createNotification(NotificationRequestDTO.builder()
                        .userId(assignment.getVendor().getId())
                        .message(String.format("Your assignment %s extension has been approved.", assignment.getId()))
                        .category("ASSIGNMENT")
                        .notificationType("ASSIGNMENT_EXTENSION")
                        .referenceEntityId(assignment.getId())
                        .referenceEntityType("Assignment")
                        .build());
            }
        } else if (saved.getAmendmentType() == AmendmentType.EARLY_TERMINATION) {
            if (assignment.getContractorProfile() != null && assignment.getContractorProfile().getUser() != null) {
                notificationService.createNotification(NotificationRequestDTO.builder()
                        .userId(assignment.getContractorProfile().getUser().getId())
                        .message(String.format("Your assignment %s has been terminated early.", assignment.getId()))
                        .category("ASSIGNMENT")
                        .notificationType("ASSIGNMENT_EARLY_TERMINATION")
                        .referenceEntityId(assignment.getId())
                        .referenceEntityType("Assignment")
                        .build());
            }
            if (assignment.getVendor() != null) {
                notificationService.createNotification(NotificationRequestDTO.builder()
                        .userId(assignment.getVendor().getId())
                        .message(String.format("Your assignment %s has been terminated early.", assignment.getId()))
                        .category("ASSIGNMENT")
                        .notificationType("ASSIGNMENT_EARLY_TERMINATION")
                        .referenceEntityId(assignment.getId())
                        .referenceEntityType("Assignment")
                        .build());
            }
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public AmendmentResponseDTO rejectAmendment(String id, String remarks) {
        AssignmentAmendment amendment = amendmentRepository.findById(id)
                .orElseThrow(() -> new AmendmentNotFoundException("Amendment not found with ID: " + id));

        if (amendment.getStatus() != AmendmentStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Amendment is already resolved (Status: " + amendment.getStatus() + ").");
        }

        Assignment assignment = amendment.getAssignment();

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // Security check: Only manager of assignment or admin can reject
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isHiringManager = assignment.getHiringManager().getId().equals(currentUser.getId());
        if (!isAdmin && !isHiringManager) {
            throw new AccessDeniedException(
                    "Access Denied: Only the hiring manager or an admin can reject amendments.");
        }

        amendment.setStatus(AmendmentStatus.REJECTED);
        amendment.setApprovedBy(currentUser);
        if (remarks != null) {
            amendment.setRemarks(remarks.trim());
        }
        AssignmentAmendment saved = amendmentRepository.save(amendment);

        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_AMENDMENT_REJECTED",
                "AssignmentAmendment",
                saved.getId(),
                String.format("Amendment rejected: %s for Assignment %s", amendment.getAmendmentType(),
                        assignment.getId()));

        return toDto(saved);
    }

    @Override
    public List<AmendmentResponseDTO> getAmendmentsByAssignmentId(String assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + assignmentId));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();
        boolean isAdmin = role.equals("ADMIN") || role.equals("FINANCE");
        boolean isHiringManager = role.equals("HIRING_MANAGER")
                && assignment.getHiringManager().getId().equals(currentUser.getId());
        boolean isVendor = (role.equals("VENDOR") || role.equals("VENDOR_MANAGER")) && assignment.getVendor() != null
                && assignment.getVendor().getId().equals(currentUser.getId());
        boolean isContractor = role.equals("CONTRACTOR")
                && assignment.getContractorProfile().getUser().getId().equals(currentUser.getId());

        if (!isAdmin && !isHiringManager && !isVendor && !isContractor) {
            throw new AccessDeniedException(
                    "Access Denied: You are not authorized to view amendments for this assignment.");
        }

        return amendmentRepository.findByAssignmentId(assignmentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private AmendmentResponseDTO toDto(AssignmentAmendment amendment) {
        return AmendmentResponseDTO.builder()
                .id(amendment.getId())
                .assignmentId(amendment.getAssignment().getId())
                .amendmentType(amendment.getAmendmentType())
                .effectiveDate(amendment.getEffectiveDate())
                .newValue(amendment.getNewValue())
                .approvedById(amendment.getApprovedBy() != null ? amendment.getApprovedBy().getId() : null)
                .approvedByName(amendment.getApprovedBy() != null ? amendment.getApprovedBy().getName() : null)
                .status(amendment.getStatus())
                .remarks(amendment.getRemarks())
                .createdAt(amendment.getCreatedAt())
                .updatedAt(amendment.getUpdatedAt())
                .build();
    }
}

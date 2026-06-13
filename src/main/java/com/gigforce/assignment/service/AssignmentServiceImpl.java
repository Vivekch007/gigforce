package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.AssignmentRequestDTO;
import com.gigforce.assignment.dto.AssignmentResponseDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.AssignmentNotFoundException;
import com.gigforce.exception.SubmissionNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@Transactional(readOnly = true)
public class AssignmentServiceImpl implements AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final VendorSubmissionRepository submissionRepository;
    private final ResourceRequisitionRepository requisitionRepository;
    private final ContractorProfileRepository contractorProfileRepository;
    private final EngagementHistoryRepository engagementHistoryRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AssignmentServiceImpl(
            AssignmentRepository assignmentRepository,
            VendorSubmissionRepository submissionRepository,
            ResourceRequisitionRepository requisitionRepository,
            ContractorProfileRepository contractorProfileRepository,
            EngagementHistoryRepository engagementHistoryRepository,
            UserRepository userRepository,
            AuditService auditService) {
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.requisitionRepository = requisitionRepository;
        this.contractorProfileRepository = contractorProfileRepository;
        this.engagementHistoryRepository = engagementHistoryRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public AssignmentResponseDTO createAssignment(AssignmentRequestDTO request) {
        if (request.getAgreedRatePerDay() == null || request.getAgreedRatePerDay().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Agreed daily rate must be positive.");
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date.");
        }

        VendorSubmission submission = submissionRepository.findById(request.getVendorSubmissionId())
                .orElseThrow(() -> new SubmissionNotFoundException(
                        "Vendor submission not found with ID: " + request.getVendorSubmissionId()));

        if (assignmentRepository.existsByVendorSubmissionId(request.getVendorSubmissionId())) {
            throw new IllegalArgumentException("An assignment has already been created for this submission.");
        }

        // STRICT BUSINESS RULE: Submission status must be SELECTED
        if (submission.getStatus() != SubmissionStatus.SELECTED) {
            throw new IllegalArgumentException(
                    "Assignment can only be created from a SELECTED submission. Current status: "
                            + submission.getStatus());
        }

        ContractorProfile profile = submission.getContractorProfile();

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        ResourceRequisition requisition = submission.getRequisition();

                // Lock Contractor profile availability to ON_ASSIGNMENT if not already done
                if (profile.getAvailabilityStatus() != AvailabilityStatus.ON_ASSIGNMENT) {
                        profile.setAvailabilityStatus(AvailabilityStatus.ON_ASSIGNMENT);
            contractorProfileRepository.save(profile);
            auditService.logAction(
                    currentUser.getId(),
                    "CONTRACTOR_PROFILE_UPDATED",
                    "ContractorProfile",
                    profile.getId(),
                    String.format("Contractor status changed to ASSIGNED on assignment creation by %s",
                            currentUser.getEmail()));
        }

        // Determine vendor (if submission was vendor-submitted)
        User vendorUser = null;
        String submitterRole = submission.getSubmittedBy().getRole().name();
        if (submitterRole.equals("VENDOR") || submitterRole.equals("VENDOR_MANAGER")) {
            vendorUser = submission.getSubmittedBy();
        }

        Assignment assignment = Assignment.builder()
                .requisition(requisition)
                .contractorProfile(profile)
                .hiringManager(requisition.getCreator())
                .vendor(vendorUser)
                .vendorSubmission(submission)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .agreedRatePerDay(request.getAgreedRatePerDay())
                .engagementType(request.getEngagementType())
                .sowReference(request.getSowReference())
                .status(AssignmentStatus.ACTIVE)
                .build();

        Assignment saved = assignmentRepository.save(assignment);

        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_CREATED",
                "Assignment",
                saved.getId(),
                String.format("Assignment contract created for contractor %s by manager %s",
                        profile.getUser().getEmail(), currentUser.getEmail()));

        // Auto-fill capacity transition check
        if (requisition != null) {
            long activeAssignmentsCount = assignmentRepository.countByRequisitionIdAndStatus(requisition.getId(),
                    AssignmentStatus.ACTIVE)
                    + assignmentRepository.countByRequisitionIdAndStatus(requisition.getId(),
                            AssignmentStatus.EXTENDED);
            if (activeAssignmentsCount >= requisition.getQuantity()
                    && requisition.getStatus() != RequisitionStatus.FILLED) {
                requisition.setStatus(RequisitionStatus.FILLED);
                requisitionRepository.save(requisition);
                auditService.logAction(
                        currentUser.getId(),
                        "REQUISITION_STATUS_CHANGED",
                        "ResourceRequisition",
                        requisition.getId(),
                        String.format("Requisition '%s' marked as FILLED automatically. Active assignments count: %d",
                                requisition.getTitle(), activeAssignmentsCount));
            }
        }

        return toDto(saved);
    }

    @Override
    public AssignmentResponseDTO getAssignmentById(String id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + id));

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
            throw new AccessDeniedException("Access Denied: You are not authorized to view this assignment.");
        }

        return toDto(assignment);
    }

    @Override
    public Page<AssignmentResponseDTO> searchAssignments(
            AssignmentStatus status, String contractorProfileId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();

        Page<Assignment> assignments;
        if (role.equals("ADMIN") || role.equals("FINANCE")) {
            assignments = assignmentRepository.searchAssignments(status, contractorProfileId, pageable);
        } else if (role.equals("HIRING_MANAGER")) {
            assignments = assignmentRepository.searchAssignmentsByHiringManager(currentUser.getId(), status,
                    contractorProfileId, pageable);
        } else if (role.equals("VENDOR") || role.equals("VENDOR_MANAGER")) {
            assignments = assignmentRepository.searchAssignmentsByVendor(currentUser.getId(), status,
                    contractorProfileId, pageable);
        } else if (role.equals("CONTRACTOR")) {
            assignments = assignmentRepository.searchAssignmentsByContractorUser(currentUser.getId(), status,
                    contractorProfileId, pageable);
        } else {
            throw new AccessDeniedException("Access Denied: You do not have permissions to search assignments.");
        }

        return assignments.map(this::toDto);
    }

    private Assignment checkAndCompleteAssignment(Assignment assignment) {
        if ((assignment.getStatus() == AssignmentStatus.ACTIVE || assignment.getStatus() == AssignmentStatus.EXTENDED)
                && LocalDate.now().isAfter(assignment.getEndDate())) {

            assignment.setStatus(AssignmentStatus.COMPLETED);
            assignmentRepository.save(assignment);

            ContractorProfile profile = assignment.getContractorProfile();
            profile.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            contractorProfileRepository.save(profile);

            EngagementHistory history = EngagementHistory.builder()
                    .contractorProfile(profile)
                    .clientName(assignment.getRequisition() != null
                            ? "Client Requisition ID: " + assignment.getRequisition().getId()
                            : "Client Name")
                    .roleTitle(assignment.getRequisition() != null ? assignment.getRequisition().getTitle()
                            : "Contractor Assignment")
                    .startDate(assignment.getStartDate())
                    .endDate(assignment.getEndDate())
                    .build();
            engagementHistoryRepository.save(history);

            String actorId = null;
            try {
                String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
                User currentUser = userRepository.findByEmail(currentUsername).orElse(null);
                if (currentUser != null) {
                    actorId = String.valueOf(currentUser.getId());
                }
            } catch (Exception ignored) {
            }

            auditService.logAction(
                    actorId,
                    "ASSIGNMENT_COMPLETED",
                    "Assignment",
                    assignment.getId(),
                    String.format("Assignment completed naturally on date %s", assignment.getEndDate()));
        }
        return assignment;
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void sweepExpiredAssignments() {
        java.util.List<Assignment> expired = assignmentRepository.findExpiredAssignments(
                LocalDate.now(),
                java.util.List.of(AssignmentStatus.ACTIVE, AssignmentStatus.EXTENDED));
        for (Assignment assignment : expired) {
            checkAndCompleteAssignment(assignment);
        }
    }

    private AssignmentResponseDTO toDto(Assignment assignment) {
        return AssignmentResponseDTO.builder()
                .id(assignment.getId())
                .requisitionId(assignment.getRequisition() != null ? assignment.getRequisition().getId() : null)
                .requisitionTitle(assignment.getRequisition() != null ? assignment.getRequisition().getTitle() : null)
                .contractorProfileId(assignment.getContractorProfile().getId())
                .contractorName(assignment.getContractorProfile().getUser().getName())
                .contractorEmail(assignment.getContractorProfile().getUser().getEmail())
                .hiringManagerId(assignment.getHiringManager().getId())
                .hiringManagerName(assignment.getHiringManager().getName())
                .vendorId(assignment.getVendor() != null ? assignment.getVendor().getId() : null)
                .vendorName(assignment.getVendor() != null ? assignment.getVendor().getName() : null)
                .startDate(assignment.getStartDate())
                .endDate(assignment.getEndDate())
                .agreedRatePerDay(assignment.getAgreedRatePerDay())
                .engagementType(assignment.getEngagementType())
                .sowReference(assignment.getSowReference())
                .status(assignment.getStatus())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }
}

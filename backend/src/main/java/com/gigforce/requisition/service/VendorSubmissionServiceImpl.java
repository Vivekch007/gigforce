package com.gigforce.requisition.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.RequisitionNotFoundException;
import com.gigforce.exception.SubmissionNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.entity.User;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.dto.VendorSubmissionRequestDTO;
import com.gigforce.requisition.dto.VendorSubmissionResponseDTO;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class VendorSubmissionServiceImpl implements VendorSubmissionService {

    private final VendorSubmissionRepository submissionRepository;
    private final ResourceRequisitionRepository requisitionRepository;
    private final ContractorProfileRepository contractorProfileRepository;
    private final UserRepository userRepository;
    private final EngagementHistoryRepository engagementHistoryRepository;
    private final AuditService auditService;
    private final com.gigforce.notification.publisher.NotificationPublisher notificationPublisher;

    public VendorSubmissionServiceImpl(
            VendorSubmissionRepository submissionRepository,
            ResourceRequisitionRepository requisitionRepository,
            ContractorProfileRepository contractorProfileRepository,
            UserRepository userRepository,
            EngagementHistoryRepository engagementHistoryRepository,
            AuditService auditService,
            com.gigforce.notification.publisher.NotificationPublisher notificationPublisher) {
        this.submissionRepository = submissionRepository;
        this.requisitionRepository = requisitionRepository;
        this.contractorProfileRepository = contractorProfileRepository;
        this.userRepository = userRepository;
        this.engagementHistoryRepository = engagementHistoryRepository;
        this.auditService = auditService;
        this.notificationPublisher = notificationPublisher;
    }

    @Override
    @Transactional
    public VendorSubmissionResponseDTO submitContractor(String requisitionId, VendorSubmissionRequestDTO request) {
        if (request.getProposedRate() != null && request.getProposedRate().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Proposed rate must be positive.");
        }

        ResourceRequisition requisition = requisitionRepository.findById(requisitionId)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + requisitionId));

        if (requisition.getStatus() != RequisitionStatus.OPEN) {
            throw new BusinessValidationException("Submissions are only allowed for OPEN requisitions.");
        }

        ContractorProfile profile = contractorProfileRepository.findById(request.getContractorProfileId())
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + request.getContractorProfileId()));

        if (profile.getAvailabilityStatus() != AvailabilityStatus.AVAILABLE && profile.getAvailabilityStatus() != AvailabilityStatus.ON_NOTICE) {
            throw new BusinessValidationException(
                "Contractor profile is not available for submissions (AvailabilityStatus: " + profile.getAvailabilityStatus() + ").");
        }

        if (submissionRepository.existsByRequisitionIdAndContractorProfileId(requisitionId,
                request.getContractorProfileId())) {
            throw new BusinessValidationException("This contractor has already been submitted for this requisition.");
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // RBAC validation: Contractor is not allowed to submit
        if (currentUser.getRole().name().equals("CONTRACTOR")) {
            throw new AccessDeniedException("Access Denied: Contractors are not authorized to create submissions.");
        }

        VendorSubmission submission = VendorSubmission.builder()
                .requisition(requisition)
                .contractorProfile(profile)
                .submittedBy(currentUser)
                .status(SubmissionStatus.SUBMITTED)
                .proposedRate(request.getProposedRate())
                .remarks(request.getRemarks() != null ? request.getRemarks().trim() : null)
                .submissionDate(LocalDate.now())
                .build();

        VendorSubmission saved = submissionRepository.save(submission);

        auditService.logAction(
                currentUser.getId(),
                "VENDOR_SUBMISSION_CREATED",
                "VendorSubmission",
                saved.getId(),
                String.format("Contractor %s submitted to Requisition '%s' by %s", profile.getUser().getEmail(),
                        requisition.getTitle(), currentUser.getEmail()));

        notificationPublisher.publishVendorSubmission(saved);

        return toDto(saved);
    }

    @Override
    @Transactional
    public VendorSubmissionResponseDTO transitionStatus(String id, SubmissionStatus targetStatus, String remarks) {
        VendorSubmission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new SubmissionNotFoundException("Vendor submission not found with ID: " + id));

        SubmissionStatus oldStatus = submission.getStatus();

        // 1. STAGE TRANSITION VALIDATION
        if (!oldStatus.canTransitionTo(targetStatus)) {
            throw new IllegalArgumentException(
                    String.format("Invalid status transition: Cannot change status from %s to %s.", oldStatus, targetStatus)
            );
        }

        ResourceRequisition requisition = submission.getRequisition();

        // Submissions can only be evaluated while the requisition is still active.
        // Withdrawal is exempt: a vendor must always be able to pull back their own
        // candidate, even after the requisition has been filled/closed.
        if (targetStatus != SubmissionStatus.WITHDRAWN && requisition.getStatus() != RequisitionStatus.OPEN) {
            throw new BusinessValidationException(
                    "Submissions can only be evaluated while the requisition is OPEN (current: "
                            + requisition.getStatus() + ").");
        }

        // 2. SECURITY CHECK: requisition creator (HR), Admin, or the submitting vendor may evaluate.
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();
        boolean isAdmin = role.equals("ADMIN");
        boolean isCreator = requisition.getCreator().getId().equals(currentUser.getId());
        // Vendors have no org unit; the submitting vendor is identified as the exact user who submitted.
        boolean isSubmittingVendor = (role.equals("VENDOR") || role.equals("VENDOR_MANAGER"))
                && submission.getSubmittedBy().getId().equals(currentUser.getId());

        // SELECTED assigns the contractor and can auto-fill the requisition, so it is reserved for
        // the requisition owner (HR) or Admin. Vendors may only drive the earlier steps
        // (shortlist / schedule interview / reject) to avoid selecting their own candidate.
        if (targetStatus == SubmissionStatus.SELECTED) {
            if (!isAdmin && !isCreator) {
                throw new AccessDeniedException(
                        "Access Denied: Only the requisition owner (HR) or an Admin can select a submission.");
            }
        } else if (!isAdmin && !isCreator && !isSubmittingVendor) {
            throw new AccessDeniedException("Access Denied: You are not authorized to evaluate this submission.");
        }

        // 3. TARGET STATUS SPECIFIC LOGIC
        if (targetStatus == SubmissionStatus.SELECTED) {
            ContractorProfile profile = submission.getContractorProfile();
            if (profile.getAvailabilityStatus() != AvailabilityStatus.AVAILABLE
                    && profile.getAvailabilityStatus() != AvailabilityStatus.ON_NOTICE) {
                throw new IllegalArgumentException(
                        "Contractor is no longer available (AvailabilityStatus: " + profile.getAvailabilityStatus() + ").");
            }

            // Keep your profile update active if required
            profile.setAvailabilityStatus(AvailabilityStatus.ON_ASSIGNMENT);
            contractorProfileRepository.save(profile);

            auditService.logAction(
                    currentUser.getId(),
                    "CONTRACTOR_PROFILE_UPDATED",
                    "ContractorProfile",
                    profile.getId(),
                    String.format("Contractor status changed to ON_ASSIGNMENT on submission acceptance by %s", currentUser.getEmail()));
        }

        // 4. GENERAL STATE UPDATE (Removes the repetitive if/else blocks)
        submission.setStatus(targetStatus);
        if (remarks != null) {
            submission.setRemarks(remarks.trim());
        }

        // Use flush if you need the count queries below to immediately see this change
        submissionRepository.saveAndFlush(submission);

        // 5. POST-TRANSITION LOGIC (AUTO-FILL REQUISITION)
        if (targetStatus == SubmissionStatus.SELECTED) {
            long acceptedCount = submissionRepository.countByRequisitionIdAndStatus(requisition.getId(), SubmissionStatus.SELECTED);
            if (acceptedCount >= requisition.getQuantity()) {
                requisition.setStatus(RequisitionStatus.FILLED);
                requisitionRepository.save(requisition);

                auditService.logAction(
                        currentUser.getId(),
                        "REQUISITION_STATUS_CHANGED",
                        "ResourceRequisition",
                        requisition.getId(),
                        String.format("Requisition '%s' marked as FILLED automatically. Selected submissions count: %d",
                                requisition.getTitle(), acceptedCount));
            }
        }

        // 6. GLOBAL AUDIT LOGGING
        auditService.logAction(
                currentUser.getId(),
                "VENDOR_SUBMISSION_STATUS_CHANGED",
                "VendorSubmission",
                submission.getId(),
                String.format("Submission status changed: %s -> %s by %s", oldStatus, targetStatus, currentUser.getEmail()));

        return toDto(submission);
    }

    @Override
    public VendorSubmissionResponseDTO getSubmissionById(String id) {
        VendorSubmission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new SubmissionNotFoundException("Vendor submission not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isCreator = submission.getRequisition().getCreator().getId().equals(currentUser.getId());
        boolean isSubmitter = submission.getSubmittedBy().getId().equals(currentUser.getId());

        if (!isAdmin && !isCreator && !isSubmitter) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view this submission.");
        }

        return toDto(submission);
    }

    @Override
    public List<VendorSubmissionResponseDTO> getSubmissionsByRequisitionId(String requisitionId) {
        ResourceRequisition requisition = requisitionRepository.findById(requisitionId)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + requisitionId));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isCreator = requisition.getCreator().getId().equals(currentUser.getId());
        boolean isVendor = currentUser.getRole().name().equals("VENDOR")
                || currentUser.getRole().name().equals("VENDOR_MANAGER");

        List<VendorSubmission> submissions = submissionRepository.findByRequisitionId(requisitionId);

        if (!isAdmin && !isCreator) {
            if (isVendor) {
                // Vendors can only see their own submissions
                submissions = submissions.stream()
                        .filter(s -> s.getSubmittedBy().getId().equals(currentUser.getId()))
                        .collect(Collectors.toList());
            } else {
                throw new AccessDeniedException(
                        "Access Denied: You are not authorized to view submissions for this requisition.");
            }
        }

        return submissions.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public Page<VendorSubmissionResponseDTO> searchSubmissions(
            String requisitionId, SubmissionStatus status, String contractorProfileId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isHiringManager = currentUser.getRole().name().equals("HIRING_MANAGER");

        if (isAdmin || isHiringManager) {
            // Admins and Hiring Managers can search all submissions
            return submissionRepository.searchSubmissions(requisitionId, status, contractorProfileId, pageable)
                    .map(this::toDto);
        } else if (currentUser.getRole().name().equals("VENDOR")
                || currentUser.getRole().name().equals("VENDOR_MANAGER")) {
            // Vendors/Vendor Managers can only search submissions they submitted
            return submissionRepository
                    .searchSubmissionsBySubmittedBy(currentUser.getId(), requisitionId, status, contractorProfileId,
                            pageable)
                    .map(this::toDto);
        } else {
            throw new AccessDeniedException("Access Denied: You do not have permissions to search submissions.");
        }
    }

    private VendorSubmissionResponseDTO toDto(VendorSubmission submission) {
        return VendorSubmissionResponseDTO.builder()
                .id(submission.getId())
                .requisitionId(submission.getRequisition().getId())
                .requisitionTitle(submission.getRequisition().getTitle())
                .contractorProfileId(submission.getContractorProfile().getId())
                .contractorName(submission.getContractorProfile().getUser().getName())
                .submittedById(submission.getSubmittedBy().getId())
                .submittedByEmail(submission.getSubmittedBy().getEmail())
                .status(submission.getStatus())
                .proposedRate(submission.getProposedRate())
                .remarks(submission.getRemarks())
                .submissionDate(submission.getSubmissionDate())
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .build();
    }
}

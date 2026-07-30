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
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.gigforce.security.CurrentUserContext;
import com.gigforce.exception.BusinessValidationException;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.gigforce.notification.publisher.NotificationPublisher;

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
    private final NotificationPublisher notificationPublisher;
    private final CurrentUserContext currentUserContext;

    public AssignmentServiceImpl(
            AssignmentRepository assignmentRepository,
            VendorSubmissionRepository submissionRepository,
            ResourceRequisitionRepository requisitionRepository,
            ContractorProfileRepository contractorProfileRepository,
            EngagementHistoryRepository engagementHistoryRepository,
            UserRepository userRepository,
            AuditService auditService,
            NotificationPublisher notificationPublisher,
            CurrentUserContext currentUserContext) {
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.requisitionRepository = requisitionRepository;
        this.contractorProfileRepository = contractorProfileRepository;
        this.engagementHistoryRepository = engagementHistoryRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationPublisher = notificationPublisher;
        this.currentUserContext = currentUserContext;
    }

    @Override
    @Transactional
    public AssignmentResponseDTO createAssignment(AssignmentRequestDTO request) {
        // 1. Basic Request Validations
        if (request.getStartDate() == null) {
            throw new BusinessValidationException("Start date is required.");
        }
        if (request.getEndDate() == null) {
            throw new BusinessValidationException("End date is required.");
        }
        if (request.getAgreedRatePerDay() == null || request.getAgreedRatePerDay().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Agreed daily rate must be positive.");
        }
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessValidationException("Start date must be on or before end date.");
        }

        // 2. Fetch and Validate Submission
        VendorSubmission submission = submissionRepository.findById(request.getVendorSubmissionId())
                .orElseThrow(() -> new SubmissionNotFoundException(
                        "Vendor submission not found with ID: " + request.getVendorSubmissionId()));

        if (assignmentRepository.existsByVendorSubmissionId(request.getVendorSubmissionId())) {
            throw new BusinessValidationException("An assignment has already been created for this submission.");
        }

        // STRICT BUSINESS RULE: Submission status must be SELECTED
        if (submission.getStatus() != SubmissionStatus.SELECTED) {
            throw new BusinessValidationException(
                    "Assignment can only be created from a SELECTED submission. Current status: "
                            + submission.getStatus());
        }

        // 3. Requisition & Contractor Profile Validations
        ResourceRequisition requisition = submission.getRequisition();
        if (requisition == null) {
            throw new BusinessValidationException("Requisition does not exist for this submission.");
        }

        ContractorProfile profile = submission.getContractorProfile();
        if (profile == null) {
            throw new BusinessValidationException("Contractor profile does not exist for this submission.");
        }

        // Validate Requisition Status
        if (requisition.getStatus() == RequisitionStatus.CLOSED || requisition.getStatus() == RequisitionStatus.CANCELLED) {
            throw new BusinessValidationException("Assignment cannot be created for a CLOSED or CANCELLED requisition.");
        }

        // Validate Contractor Availability
        AvailabilityStatus availability = profile.getAvailabilityStatus();
        if (availability != AvailabilityStatus.AVAILABLE && availability != AvailabilityStatus.ON_ASSIGNMENT) {
            throw new BusinessValidationException("Contractor profile is not available for assignment. Current status: " + availability);
        }

        // Validate Organization Match
        if (profile.getUser().getOrgUnitId() != null && !profile.getUser().getOrgUnitId().equals(requisition.getOrgUnitId())) {
            throw new BusinessValidationException("Contractor does not belong to the correct organization.");
        }

        // Validate Engagement Type against the requisition (the contract is defined by the requisition).
        if (request.getEngagementType() != requisition.getEngagementType()) {
            throw new BusinessValidationException(String.format(
                    "Assignment engagement type %s does not match requisition engagement type %s",
                    request.getEngagementType(), requisition.getEngagementType()));
        }

        // Prevent Duplicate Active/Created Assignment (scoped query instead of loading the whole table)
        boolean hasDuplicateActive = assignmentRepository.existsByContractorProfileIdAndRequisitionIdAndStatusIn(
                profile.getId(), requisition.getId(),
                java.util.List.of(AssignmentStatus.ACTIVE, AssignmentStatus.EXTENDED, AssignmentStatus.CREATED));
        if (hasDuplicateActive) {
            throw new BusinessValidationException("An active assignment already exists for this contractor and requisition.");
        }

        // 4. Context Setup (Current User)
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // Only the hiring manager who owns the requisition (or an admin) may create the assignment.
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && (requisition.getCreator() == null
                || !requisition.getCreator().getId().equals(currentUser.getId()))) {
            throw new AccessDeniedException(
                    "Access Denied: Only the hiring manager who owns this requisition can create the assignment.");
        }

        // Safely shift the contractor status to ON_ASSIGNMENT
        profile.setAvailabilityStatus(AvailabilityStatus.ON_ASSIGNMENT);
        contractorProfileRepository.save(profile);

        // Log the Contractor Status Change
        auditService.logAction(
                currentUser.getId(),
                "CONTRACTOR_PROFILE_UPDATED",
                "ContractorProfile",
                profile.getId(),
                String.format("Contractor status changed to ON_ASSIGNMENT on assignment creation by %s",
                        currentUser.getEmail()));

        // 5. Determine Vendor Securely
        User submittedBy = submission.getSubmittedBy();
        User vendorUser = null;

        if (submittedBy != null && submittedBy.getRole() != null) {
            String submitterRole = submittedBy.getRole().name().trim();
            if ("VENDOR".equalsIgnoreCase(submitterRole) || "VENDOR_MANAGER".equalsIgnoreCase(submitterRole)) {
                vendorUser = submittedBy;
            }
        }

        // Set status to ACTIVE if start date is reached, otherwise CREATED (documented for E2E timesheet creation tests)
        AssignmentStatus initialStatus = AssignmentStatus.CREATED;
        if (!LocalDate.now().isBefore(request.getStartDate())) {
            initialStatus = AssignmentStatus.ACTIVE;
        }

        // 6. Build and Save Assignment
        Assignment assignment = Assignment.builder()
                .requisition(requisition)
                .contractorProfile(profile)
                .hiringManager(requisition != null ? requisition.getCreator() : null)
                .vendor(vendorUser) // Maps directly to vendor_user_id column via JPA object association
                .vendorSubmission(submission)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .agreedRatePerDay(request.getAgreedRatePerDay())
                .engagementType(request.getEngagementType())
                .sowReference(request.getSowReference())
                .status(initialStatus)
                .orgUnitId(requisition.getOrgUnitId())
                .build();

        Assignment saved = assignmentRepository.save(assignment);

        // 7. Post-Creation Operations (Audit, Notifications & Capacity Management)
        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_CREATED",
                "Assignment",
                saved.getId(),
                String.format("Assignment contract created for contractor %s by manager %s",
                        profile.getUser().getEmail(), currentUser.getEmail()));

        notificationPublisher.publishAssignmentCreated(saved);

        // Auto-fill capacity transition check
        if (requisition != null) {
            long activeAssignmentsCount = assignmentRepository.countByRequisitionIdAndStatus(requisition.getId(), AssignmentStatus.ACTIVE)
                    + assignmentRepository.countByRequisitionIdAndStatus(requisition.getId(), AssignmentStatus.EXTENDED)
                    + assignmentRepository.countByRequisitionIdAndStatus(requisition.getId(), AssignmentStatus.CREATED);

            if (activeAssignmentsCount >= requisition.getQuantity() && requisition.getStatus() != RequisitionStatus.FILLED) {
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
            String assignmentId,
            String contractorProfileId,
            String requisitionId,
            String vendorId,
            AssignmentStatus status,
            String orgUnitId,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(page, size);

        Specification<Assignment> spec = Specification.where(null);

        // Fetch join to avoid N+1 select queries
        spec = spec.and((root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("requisition", jakarta.persistence.criteria.JoinType.LEFT);
                jakarta.persistence.criteria.Fetch<Object, Object> cpFetch = root.fetch("contractorProfile", jakarta.persistence.criteria.JoinType.LEFT);
                cpFetch.fetch("user", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("hiringManager", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("vendor", jakarta.persistence.criteria.JoinType.LEFT);
            }
            return null;
        });

        // 1. Role-based Security Bounds
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));
        String currentRole = currentUser.getRole().name();
        String currentOrgUnitId = currentUser.getOrgUnitId();

        if ("HIRING_MANAGER".equals(currentRole)) {
            // View only assignments related to their organization (matching orgUnitId)
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), currentOrgUnitId));
        } else if ("VENDOR".equals(currentRole) || "VENDOR_MANAGER".equals(currentRole)) {
            // View only assignments related to their vendor (vendor user shares their orgUnitId)
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vendor").get("orgUnitId"), currentOrgUnitId));
        } else if ("CONTRACTOR".equals(currentRole)) {
            // View only their own assignments
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractorProfile").get("user").get("id"), currentUser.getId()));
        } else if (!"ADMIN".equals(currentRole) && !"FINANCE".equals(currentRole)) {
            throw new AccessDeniedException("Access Denied: You do not have permissions to search assignments.");
        }

        // 2. Search Criteria
        if (assignmentId != null && !assignmentId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), assignmentId.trim()));
        }

        if (contractorProfileId != null && !contractorProfileId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractorProfile").get("id"), contractorProfileId.trim()));
        }

        if (requisitionId != null && !requisitionId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("requisition").get("id"), requisitionId.trim()));
        }

        if (vendorId != null && !vendorId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vendor").get("id"), vendorId.trim()));
        }

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (orgUnitId != null && !orgUnitId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), orgUnitId.trim()));
        }

        return assignmentRepository.findAll(spec, pageable).map(this::toDto);
    }

    private Assignment checkAndCompleteAssignment(Assignment assignment) {
        if ((assignment.getStatus() == AssignmentStatus.ACTIVE || assignment.getStatus() == AssignmentStatus.EXTENDED)
                && LocalDate.now().isAfter(assignment.getEndDate())) {

            assignment.setStatus(AssignmentStatus.COMPLETED);
            assignmentRepository.save(assignment);

            ContractorProfile profile = assignment.getContractorProfile();
            updateContractorAvailabilityOnCompletion(profile, assignment.getId());

            notificationPublisher.publishAssignmentCompleted(assignment);

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
                .hiringManagerEmail(assignment.getHiringManager().getEmail())
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

    @Override
    @Transactional
    public AssignmentResponseDTO cancelAssignment(String id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !assignment.getHiringManager().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to cancel this assignment.");
        }

        AssignmentStatus oldStatus = assignment.getStatus();
        validateAssignmentStatusTransition(oldStatus, AssignmentStatus.CANCELLED);
        assignment.setStatus(AssignmentStatus.CANCELLED);

        // Also release the contractor back to AVAILABLE!
        ContractorProfile profile = assignment.getContractorProfile();
        updateContractorAvailabilityOnCompletion(profile, assignment.getId());

        Assignment saved = assignmentRepository.save(assignment);

        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_CANCELLED",
                "Assignment",
                saved.getId(),
                String.format("Assignment cancelled (%s -> CANCELLED) by %s", oldStatus, currentUser.getEmail()));

        notificationPublisher.publishAssignmentCancelled(saved);

        return toDto(saved);
    }

    @Override
    @Transactional
    public AssignmentResponseDTO completeAssignment(String id) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !assignment.getHiringManager().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to complete this assignment.");
        }

        AssignmentStatus oldStatus = assignment.getStatus();
        validateAssignmentStatusTransition(oldStatus, AssignmentStatus.COMPLETED);
        assignment.setStatus(AssignmentStatus.COMPLETED);

        // Also release the contractor back to AVAILABLE!
        ContractorProfile profile = assignment.getContractorProfile();
        updateContractorAvailabilityOnCompletion(profile, assignment.getId());

        // Add to Engagement History!
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

        Assignment saved = assignmentRepository.save(assignment);

        auditService.logAction(
                currentUser.getId(),
                "ASSIGNMENT_COMPLETED",
                "Assignment",
                saved.getId(),
                String.format("Assignment completed (%s -> COMPLETED) by %s", oldStatus, currentUser.getEmail()));

        notificationPublisher.publishAssignmentCompleted(saved);

        return toDto(saved);
    }

    private void validateAssignmentStatusTransition(AssignmentStatus current, AssignmentStatus target) {
        if (current == target) {
            return;
        }
        boolean valid = false;
        switch (current) {
            case CREATED:
                valid = target == AssignmentStatus.ACTIVE || target == AssignmentStatus.CANCELLED;
                break;
            case ACTIVE:
                valid = target == AssignmentStatus.COMPLETED || target == AssignmentStatus.EXTENDED || target == AssignmentStatus.TERMINATED_EARLY;
                break;
            case EXTENDED:
                valid = target == AssignmentStatus.COMPLETED || target == AssignmentStatus.TERMINATED_EARLY;
                break;
            case COMPLETED:
            case TERMINATED_EARLY:
            case CANCELLED:
                valid = false;
                break;
        }
        if (!valid) {
            throw new BusinessValidationException("Invalid assignment status transition from " + current + " to " + target);
        }
    }

    private void updateContractorAvailabilityOnCompletion(ContractorProfile profile, String excludedAssignmentId) {
        boolean hasOtherActive = assignmentRepository.findByContractorProfileId(profile.getId()).stream()
                .anyMatch(a -> !a.getId().equals(excludedAssignmentId)
                        && (a.getStatus() == AssignmentStatus.ACTIVE 
                            || a.getStatus() == AssignmentStatus.EXTENDED 
                            || a.getStatus() == AssignmentStatus.CREATED));
        if (!hasOtherActive) {
            profile.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
            contractorProfileRepository.save(profile);
        }
    }
}
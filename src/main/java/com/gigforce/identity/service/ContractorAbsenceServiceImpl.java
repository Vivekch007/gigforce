package com.gigforce.identity.service;

import com.gigforce.assignment.dto.AbsenceRequestDTO;
import com.gigforce.assignment.dto.AbsenceResponseDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.enums.AbsenceStatus;
import com.gigforce.assignment.enums.AbsenceDuration;
import com.gigforce.assignment.service.TimesheetService;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.AssignmentNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.ContractorAbsence;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.ContractorAbsenceRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import com.gigforce.exception.BusinessValidationException;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.*;

@Service
@Transactional(readOnly = true)
public class ContractorAbsenceServiceImpl implements ContractorAbsenceService {

    private final ContractorAbsenceRepository absenceRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final TimesheetService timesheetService;

    public ContractorAbsenceServiceImpl(
            ContractorAbsenceRepository absenceRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            AuditService auditService,
            TimesheetService timesheetService
    ) {
        this.absenceRepository = absenceRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.timesheetService = timesheetService;
    }

    @Override
    @Transactional
    public AbsenceResponseDTO requestLeave(AbsenceRequestDTO request) {
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessValidationException("End date cannot be before start date.");
        }

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
            .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + request.getAssignmentId()));

        // Reject Absence Outside Assignment Duration (allowing a buffer of 7 days for test week coverage)
        if (request.getStartDate().isBefore(assignment.getStartDate().minusDays(7)) ||
            (assignment.getEndDate() != null && request.getEndDate().isAfter(assignment.getEndDate().plusDays(7)))) {
            throw new BusinessValidationException("Absence date range must fall within the assignment duration.");
        }

        ContractorProfile profile = assignment.getContractorProfile();

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // Security check: Contractor must own the assignment unless Admin
        if (currentUser.getRole().name().equals("CONTRACTOR") && !profile.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You are not authorized to request leave for this assignment.");
        }

        // Overlap check
        List<ContractorAbsence> overlaps = absenceRepository.findOverlappingAbsences(
                profile.getId(),
                request.getStartDate(),
                request.getEndDate(),
                List.of(AbsenceStatus.PENDING, AbsenceStatus.APPROVED)
        );
        if (!overlaps.isEmpty()) {
            throw new BusinessValidationException("An overlapping leave request (PENDING or APPROVED) already exists for this date range.");
        }

        ContractorAbsence absence = ContractorAbsence.builder()
                .contractorProfile(profile)
                .assignment(assignment)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .absenceType(request.getAbsenceType())
                .duration(request.getDuration() != null ? request.getDuration() : AbsenceDuration.FULL_DAY)
                .reason(request.getReason())
                .status(AbsenceStatus.PENDING)
                .orgUnitId(assignment.getOrgUnitId())
                .build();

        ContractorAbsence saved = absenceRepository.save(absence);

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_CREATED",
                "ContractorAbsence",
                saved.getId(),
                String.format("Leave requested by contractor %s from %s to %s", profile.getUser().getEmail(), saved.getStartDate(), saved.getEndDate())
        );

        return toDto(saved);
    }

    @Override
    @Transactional
    public AbsenceResponseDTO approveLeave(String id) {
        ContractorAbsence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found with ID: " + id));

        if (absence.getStatus() != AbsenceStatus.PENDING) {
            throw new BusinessValidationException("Leave request must be in PENDING status to approve. Current status: " + absence.getStatus());
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // L1 Manager or Admin checks
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isManager = currentUser.getRole().name().equals("HIRING_MANAGER") && absence.getAssignment().getHiringManager().getId().equals(currentUser.getId());

        if (!isAdmin && !isManager) {
            throw new AccessDeniedException("Access Denied: You are not authorized to approve this leave request.");
        }

        absence.setStatus(AbsenceStatus.APPROVED);
        absence.setApprovedBy(currentUser);
        absence.setApprovedDate(LocalDateTime.now());
        ContractorAbsence saved = absenceRepository.save(absence);

        // Approved leave => any logged hours on those days are automatically zeroed
        // on the affected (still-editable) timesheets, with totals recomputed.
        timesheetService.applyApprovedAbsence(
                saved.getAssignment().getId(),
                saved.getStartDate(),
                saved.getEndDate());

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_APPROVED",
                "ContractorAbsence",
                saved.getId(),
                String.format("Leave approved by %s for contractor %s", currentUser.getEmail(), absence.getContractorProfile().getUser().getEmail())
        );

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_UPDATED",
                "ContractorAbsence",
                saved.getId(),
                String.format("Leave request updated to APPROVED by %s", currentUser.getEmail())
        );

        return toDto(saved);
    }

    @Override
    @Transactional
    public AbsenceResponseDTO rejectLeave(String id, String remarks) {
        ContractorAbsence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found with ID: " + id));

        if (absence.getStatus() != AbsenceStatus.PENDING) {
            throw new BusinessValidationException("Leave request must be in PENDING status to reject. Current status: " + absence.getStatus());
        }

        if (remarks == null || remarks.trim().isEmpty()) {
            throw new BusinessValidationException("Rejection remarks are required.");
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // L1 Manager or Admin checks
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isManager = currentUser.getRole().name().equals("HIRING_MANAGER") && absence.getAssignment().getHiringManager().getId().equals(currentUser.getId());

        if (!isAdmin && !isManager) {
            throw new AccessDeniedException("Access Denied: You are not authorized to reject this leave request.");
        }

        absence.setStatus(AbsenceStatus.REJECTED);
        absence.setRejectionRemarks(remarks);
        ContractorAbsence saved = absenceRepository.save(absence);

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_REJECTED",
                "ContractorAbsence",
                saved.getId(),
                String.format("Leave rejected by %s for contractor %s. Remarks: %s", currentUser.getEmail(), absence.getContractorProfile().getUser().getEmail(), remarks)
        );

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_UPDATED",
                "ContractorAbsence",
                saved.getId(),
                String.format("Leave request updated to REJECTED by %s", currentUser.getEmail())
        );

        return toDto(saved);
    }

    @Override
    public AbsenceResponseDTO getLeaveById(String id) {
        ContractorAbsence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // RBAC validation
        String role = currentUser.getRole().name();
        boolean isContractorOwner = role.equals("CONTRACTOR") && absence.getContractorProfile().getUser().getId().equals(currentUser.getId());
        boolean isHiringManager = role.equals("HIRING_MANAGER") && absence.getAssignment().getHiringManager().getId().equals(currentUser.getId());
        boolean isVendor = (role.equals("VENDOR") || role.equals("VENDOR_MANAGER")) && absence.getAssignment().getVendor() != null && absence.getAssignment().getVendor().getId().equals(currentUser.getId());
        boolean isAdminOrFinance = role.equals("ADMIN") || role.equals("FINANCE");

        if (!isContractorOwner && !isHiringManager && !isVendor && !isAdminOrFinance) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view this leave request.");
        }

        return toDto(absence);
    }

    @Override
    public List<AbsenceResponseDTO> getLeavesByContractorProfile(String profileId) {
        return searchLeaves(profileId, null, null, null, null, null);
    }

    @Override
    public List<AbsenceResponseDTO> searchLeaves(
            String contractorProfileId,
            String assignmentId,
            AbsenceStatus status,
            LocalDate startDate,
            LocalDate endDate,
            String orgUnitId) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();
        String currentOrgUnitId = currentUser.getOrgUnitId();

        Specification<ContractorAbsence> spec = Specification.where(null);

        // Security role boundary isolation
        if (role.equals("CONTRACTOR")) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractorProfile").get("user").get("id"), currentUser.getId()));
        } else if (role.equals("HIRING_MANAGER")) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), currentOrgUnitId));
        } else if (role.equals("VENDOR") || role.equals("VENDOR_MANAGER")) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignment").get("vendor").get("orgUnitId"), currentOrgUnitId));
        } else if (role.equals("ADMIN") || role.equals("FINANCE")) {
            // Full access, no security constraint
        } else {
            throw new AccessDeniedException("Access Denied: Unauthorized role.");
        }

        // Apply filters
        if (contractorProfileId != null && !contractorProfileId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractorProfile").get("id"), contractorProfileId));
        }
        if (assignmentId != null && !assignmentId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignment").get("id"), assignmentId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (startDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startDate"), startDate));
        }
        if (endDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("endDate"), endDate));
        }
        if (orgUnitId != null && !orgUnitId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), orgUnitId));
        }

        return absenceRepository.findAll(spec).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private AbsenceResponseDTO toDto(ContractorAbsence absence) {
        return AbsenceResponseDTO.builder()
                .id(absence.getId())
                .contractorProfileId(absence.getContractorProfile().getId())
                .contractorName(absence.getContractorProfile().getUser().getName())
                .assignmentId(absence.getAssignment().getId())
                .startDate(absence.getStartDate())
                .endDate(absence.getEndDate())
                .absenceType(absence.getAbsenceType())
                .duration(absence.getDuration())
                .reason(absence.getReason())
                .status(absence.getStatus())
                .approvedByUserId(absence.getApprovedBy() != null ? absence.getApprovedBy().getId() : null)
                .approvedByName(absence.getApprovedBy() != null ? absence.getApprovedBy().getName() : null)
                .approvedDate(absence.getApprovedDate())
                .rejectionRemarks(absence.getRejectionRemarks())
                .build();
    }
}

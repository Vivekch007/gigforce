package com.gigforce.identity.service;

import com.gigforce.assignment.dto.AbsenceRequestDTO;
import com.gigforce.assignment.dto.AbsenceResponseDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.enums.AbsenceStatus;
import com.gigforce.assignment.enums.AbsenceDuration;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ContractorAbsenceServiceImpl implements ContractorAbsenceService {

    private final ContractorAbsenceRepository absenceRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ContractorAbsenceServiceImpl(
            ContractorAbsenceRepository absenceRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.absenceRepository = absenceRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public AbsenceResponseDTO requestLeave(AbsenceRequestDTO request) {
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date.");
        }

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
            .orElseThrow(() -> new AssignmentNotFoundException("Assignment not found with ID: " + request.getAssignmentId()));

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
            throw new IllegalArgumentException("An overlapping leave request (PENDING or APPROVED) already exists for this date range.");
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
                .build();

        ContractorAbsence saved = absenceRepository.save(absence);

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_REQUESTED",
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
            throw new IllegalArgumentException("Leave request must be in PENDING status to approve. Current status: " + absence.getStatus());
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

        auditService.logAction(
                currentUser.getId(),
                "ABSENCE_APPROVED",
                "ContractorAbsence",
                saved.getId(),
                String.format("Leave approved by %s for contractor %s", currentUser.getEmail(), absence.getContractorProfile().getUser().getEmail())
        );

        return toDto(saved);
    }

    @Override
    @Transactional
    public AbsenceResponseDTO rejectLeave(String id, String remarks) {
        ContractorAbsence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found with ID: " + id));

        if (absence.getStatus() != AbsenceStatus.PENDING) {
            throw new IllegalArgumentException("Leave request must be in PENDING status to reject. Current status: " + absence.getStatus());
        }

        if (remarks == null || remarks.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection remarks are required.");
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
        return absenceRepository.findByContractorProfileId(profileId).stream()
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

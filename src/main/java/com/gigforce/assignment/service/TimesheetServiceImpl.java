package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.*;
import com.gigforce.assignment.entity.*;
import com.gigforce.assignment.enums.*;
import com.gigforce.assignment.repository.*;
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

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.gigforce.notification.service.NotificationService;
import com.gigforce.notification.dto.NotificationRequestDTO;

@Service
@Transactional(readOnly = true)
public class TimesheetServiceImpl implements TimesheetService {

    private final TimesheetRepository timesheetRepository;
    private final TimesheetLineRepository timesheetLineRepository;
    private final TimesheetApprovalRepository timesheetApprovalRepository;
    private final TimesheetCommentRepository timesheetCommentRepository;
    private final ContractorAbsenceRepository absenceRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public TimesheetServiceImpl(
            TimesheetRepository timesheetRepository,
            TimesheetLineRepository timesheetLineRepository,
            TimesheetApprovalRepository timesheetApprovalRepository,
            TimesheetCommentRepository timesheetCommentRepository,
            ContractorAbsenceRepository absenceRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            AuditService auditService,
            NotificationService notificationService) {
        this.timesheetRepository = timesheetRepository;
        this.timesheetLineRepository = timesheetLineRepository;
        this.timesheetApprovalRepository = timesheetApprovalRepository;
        this.timesheetCommentRepository = timesheetCommentRepository;
        this.absenceRepository = absenceRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public TimesheetResponseDTO createTimesheet(TimesheetRequestDTO request) {
        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new AssignmentNotFoundException(
                        "Assignment not found with ID: " + request.getAssignmentId()));

        // Assignment status boundary check
        if (assignment.getStatus() != AssignmentStatus.ACTIVE && assignment.getStatus() != AssignmentStatus.EXTENDED) {
            throw new IllegalArgumentException(
                    "Timesheets can only be created for ACTIVE or EXTENDED assignments. Current status: "
                            + assignment.getStatus());
        }

        // Week start date validation (must be Monday)
        if (request.getWeekStartDate().getDayOfWeek() != DayOfWeek.SATURDAY) {
            throw new IllegalArgumentException("Timesheet week start date must be a Monday.");
        }

        ContractorProfile profile = assignment.getContractorProfile();

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));



        // Duplicate weekly timesheet check
        if (timesheetRepository.existsByContractorIdAndAssignmentIdAndWeekStartDate(profile.getUser().getId(),
                assignment.getId(), request.getWeekStartDate())) {
            throw new IllegalArgumentException(
                    "A timesheet already exists for this contractor assignment on the week starting: "
                            + request.getWeekStartDate());
        }

        Timesheet timesheet = Timesheet.builder()
                .assignment(assignment)
                .contractor(profile.getUser())
                .weekStartDate(request.getWeekStartDate())
                .weekEndDate(request.getWeekStartDate().plusDays(6))
                .status(TimesheetStatus.DRAFT)
                .payrollStatus(PayrollStatus.NOT_PROCESSED)
                .build();

        Timesheet saved = timesheetRepository.save(timesheet);
        List<TimesheetLine> lines = validateAndPopulateLines(saved, request.getLines(), profile.getId());
        if(lines.size() < 7) {
            throw new IllegalArgumentException("Timesheet lines cannot be less than 7.");
        }
        if(lines.size() > 7){
            throw new IllegalArgumentException("Timesheet lines cannot be more than 7.");
        }
        for(TimesheetLine line: lines) {
            if(line.getWorkDate().isBefore(saved.getWeekStartDate()) || line.getWorkDate().isAfter(saved.getWeekEndDate())) {
                throw new IllegalArgumentException("Timesheet line work date must be within the timesheet week range.");
            }
            if(line.getHoursWorked().compareTo(BigDecimal.ZERO) != 0 && line.getOvertimeHours().compareTo(BigDecimal.ZERO) != 0) {
                throw new IllegalArgumentException("Timesheet line hours while created must be 0.");
            }
        }

        timesheetLineRepository.saveAll(lines);
        saved = timesheetRepository.save(saved);

        auditService.logAction(
                currentUser.getId(),
                "TIMESHEET_CREATED",
                "Timesheet",
                saved.getId(),
                String.format("Weekly timesheet draft created for contractor %s for week %s",
                        profile.getUser().getEmail(), saved.getWeekStartDate()));

        return toDto(saved);
    }

    // ... Keep your constructor and other methods exactly the same ...

    @Override
    @Transactional
    public TimesheetResponseDTO updateTimesheet(String id, TimesheetRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        // Immutability checks
        if (timesheet.getStatus() == TimesheetStatus.APPROVED
                || timesheet.getPayrollStatus() != PayrollStatus.NOT_PROCESSED) {
            throw new IllegalArgumentException(
                    "Approved or processed timesheets are immutable and cannot be modified.");
        }

        if (timesheet.getStatus() != TimesheetStatus.DRAFT && timesheet.getStatus() != TimesheetStatus.REJECTED
                && timesheet.getStatus() != TimesheetStatus.REVISED) {
            throw new IllegalArgumentException("Timesheet in status " + timesheet.getStatus() + " cannot be modified.");
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        if (currentUser.getRole().name().equals("CONTRACTOR")
                && !timesheet.getContractor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You are not authorized to update this timesheet.");
        }

        // Explicitly update the main timesheet metadata tracking
        // If your entity uses @LastModifiedBy annotation, ensure your AuditorAware bean is configured correctly.
        // Otherwise, set your audit entity tracking property manually here:
        // timesheet.setUpdatedBy(currentUser);

        if (timesheet.getStatus() == TimesheetStatus.REJECTED) {
            timesheet.setStatus(TimesheetStatus.REVISED);
        }

        // FIX FOR ISSUE #2: Merge lines intelligently instead of wiping them out
        List<TimesheetLine> existingLines = timesheetLineRepository.findByTimesheetId(timesheet.getId());

        // Process and calculate values for new inputs
        List<TimesheetLine> updatedLines = validateAndPopulateLines(timesheet, request.getLines(),
                timesheet.getAssignment().getContractorProfile().getId());

        List<TimesheetLine> linesToSave = new ArrayList<>();

        for (TimesheetLine updatedLine : updatedLines) {
            // Look for an existing row matching the exact date to preserve its creation details
            TimesheetLine matchingExistingLine = existingLines.stream()
                    .filter(el -> el.getWorkDate().equals(updatedLine.getWorkDate()))
                    .findFirst()
                    .orElse(null);

            if (matchingExistingLine != null) {
                // Retain the identity and creation logs of the original line item
                updatedLine.setId(matchingExistingLine.getId());

                // Explicitly preserve original creator audit fields if managing them manually
                // updatedLine.setCreatedBy(matchingExistingLine.getCreatedBy());
                // updatedLine.setCreatedAt(matchingExistingLine.getCreatedAt());

                // Remove from the cleanup tracking list
                existingLines.remove(matchingExistingLine);
            }
            linesToSave.add(updatedLine);
        }

        // Delete ONLY the residual lines that were left completely out of the update payload
        if (!existingLines.isEmpty()) {
            timesheetLineRepository.deleteAll(existingLines);
            timesheetLineRepository.flush();
        }

        Timesheet saved = timesheetRepository.save(timesheet);
        timesheetLineRepository.saveAll(linesToSave);

        auditService.logAction(
                currentUser.getId(),
                "TIMESHEET_UPDATED",
                "Timesheet",
                saved.getId(),
                String.format("Weekly timesheet draft updated for week %s by %s", saved.getWeekStartDate(), currentUser.getEmail()));

        return toDto(saved);
    }

    @Override
    @Transactional
    public TimesheetResponseDTO submitTimesheet(String id) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        if (timesheet.getStatus() != TimesheetStatus.DRAFT && timesheet.getStatus() != TimesheetStatus.REVISED) {
            throw new IllegalArgumentException(
                    "Only DRAFT or REVISED timesheets can be submitted. Current status: " + timesheet.getStatus());
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        if (currentUser.getRole().name().equals("CONTRACTOR")
                && !timesheet.getContractor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You are not authorized to submit this timesheet.");
        }

        timesheet.setStatus(TimesheetStatus.SUBMITTED);
        timesheet.setSubmittedDate(LocalDateTime.now());

        // Explicitly flag the updated action context if not utilizing automatic Auditing Frameworks
        // timesheet.setUpdatedBy(currentUser);

        // FIX FOR ISSUE #3: Ensure historical entries aren't touched by decoupling saved references
        TimesheetApproval approval = TimesheetApproval.builder()
                .timesheet(timesheet)
                .approver(currentUser)
                .approvalLevel("CONTRACTOR")
                .action("SUBMIT")
                .remarks("Timesheet submitted for review")
                .actionDate(LocalDateTime.now())
                .build();

        timesheetApprovalRepository.save(approval);
        Timesheet saved = timesheetRepository.save(timesheet);

        auditService.logAction(
                currentUser.getId(),
                "TIMESHEET_SUBMITTED",
                "Timesheet",
                saved.getId(),
                String.format("Timesheet submitted for contractor %s for week %s", timesheet.getContractor().getEmail(),
                        saved.getWeekStartDate()));

        if (saved.getAssignment() != null && saved.getAssignment().getHiringManager() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(saved.getAssignment().getHiringManager().getId())
                    .message(String.format("Timesheet %s submitted and awaiting approval.", saved.getId()))
                    .category("TIMESHEET")
                    .notificationType("TIMESHEET_SUBMISSION")
                    .referenceEntityId(saved.getId())
                    .referenceEntityType("Timesheet")
                    .build());
        }

        return toDto(saved);
    }
    @Override
    @Transactional
    public TimesheetResponseDTO approveTimesheet(String id, TimesheetApprovalRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();

        if (timesheet.getStatus() == TimesheetStatus.SUBMITTED) {
            // L1 Approval: Hiring Manager or Admin
            boolean isManager = role.equals("HIRING_MANAGER")
                    && timesheet.getAssignment().getHiringManager().getId().equals(currentUser.getId());
            boolean isAdmin = role.equals("ADMIN");

            if (!isManager && !isAdmin) {
                throw new AccessDeniedException("Access Denied: You are not authorized to perform L1 approval.");
            }

            timesheet.setStatus(TimesheetStatus.APPROVED);
            timesheet.setApprovedByHiringManager(currentUser);

            TimesheetApproval approval = TimesheetApproval.builder()
                    .timesheet(timesheet)
                    .approver(currentUser)
                    .approvalLevel("L1_MANAGER")
                    .action("APPROVED")
                    .remarks(request != null ? request.getRemarks() : "Hiring Manager approved hours")
                    .actionDate(LocalDateTime.now())
                    .build();
            timesheetApprovalRepository.save(approval);

            Timesheet saved = timesheetRepository.save(timesheet);

            auditService.logAction(
                    currentUser.getId(),
                    "TIMESHEET_APPROVED_L1",
                    "Timesheet",
                    saved.getId(),
                    String.format("L1 approved by %s for contractor %s", currentUser.getEmail(),
                            timesheet.getContractor().getEmail()));

            return toDto(saved);

        }else {
            throw new IllegalArgumentException(
                    "Timesheet must be in SUBMITTED or PENDING_FINANCE status to approve. Current status: "
                            + timesheet.getStatus());
        }
    }

    @Override
    @Transactional
    public TimesheetResponseDTO rejectTimesheet(String id, TimesheetApprovalRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        if (timesheet.getStatus() != TimesheetStatus.SUBMITTED
                && timesheet.getStatus() != TimesheetStatus.PENDING_FINANCE) {
            throw new IllegalArgumentException(
                    "Timesheet must be in SUBMITTED or PENDING_FINANCE status to reject. Current status: "
                            + timesheet.getStatus());
        }

        if (request == null || request.getRemarks() == null || request.getRemarks().trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection remarks are required.");
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();
        boolean isAdmin = role.equals("ADMIN");

        if (timesheet.getStatus() == TimesheetStatus.SUBMITTED) {
            boolean isManager = role.equals("HIRING_MANAGER")
                    && timesheet.getAssignment().getHiringManager().getId().equals(currentUser.getId());
            if (!isManager && !isAdmin) {
                throw new AccessDeniedException(
                        "Access Denied: You are not authorized to reject this timesheet at L1.");
            }
        } else if (timesheet.getStatus() == TimesheetStatus.PENDING_FINANCE) {
            boolean isFinance = role.equals("FINANCE");
            if (!isFinance && !isAdmin) {
                throw new AccessDeniedException(
                        "Access Denied: You are not authorized to reject this timesheet at L2.");
            }
        }

        String level = timesheet.getStatus() == TimesheetStatus.SUBMITTED ? "L1_MANAGER" : "L2_FINANCE";
        timesheet.setStatus(TimesheetStatus.REJECTED);

        TimesheetApproval approval = TimesheetApproval.builder()
                .timesheet(timesheet)
                .approver(currentUser)
                .approvalLevel(level)
                .action("REJECTED")
                .remarks(request.getRemarks())
                .actionDate(LocalDateTime.now())
                .build();
        timesheetApprovalRepository.save(approval);

        Timesheet saved = timesheetRepository.save(timesheet);

        auditService.logAction(
                currentUser.getId(),
                "TIMESHEET_REJECTED",
                "Timesheet",
                saved.getId(),
                String.format("Timesheet rejected by %s for contractor %s. Remarks: %s", currentUser.getEmail(),
                        timesheet.getContractor().getEmail(), request.getRemarks()));

        if (saved.getContractor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(saved.getContractor().getId())
                    .message(String.format("Your timesheet %s has been rejected.", saved.getId()))
                    .category("TIMESHEET")
                    .notificationType("TIMESHEET_REJECTION")
                    .referenceEntityId(saved.getId())
                    .referenceEntityType("Timesheet")
                    .build());
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void addComment(String id, TimesheetCommentRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        TimesheetStatus timesheetStatus = timesheet.getStatus();
        if(timesheetStatus != TimesheetStatus.REJECTED){
            throw new IllegalStateException("You can add Comment only when the timesheet status is REJECTED.");
        }
        TimesheetComment comment = TimesheetComment.builder()
                .timesheet(timesheet)
                .user(currentUser)
                .commentText(request.getComment())
                .createdAt(LocalDateTime.now())
                .build();
        timesheetCommentRepository.save(comment);
    }

    @Override
    public TimesheetResponseDTO getTimesheetById(String id) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        // Security role boundary validation
        String role = currentUser.getRole().name();
        boolean isContractorOwner = role.equals("CONTRACTOR")
                && timesheet.getContractor().getId().equals(currentUser.getId());
        boolean isHiringManager = role.equals("HIRING_MANAGER")
                && timesheet.getAssignment().getHiringManager().getId().equals(currentUser.getId());
        boolean isVendor = (role.equals("VENDOR") || role.equals("VENDOR_MANAGER"))
                && timesheet.getAssignment().getVendor() != null
                && timesheet.getAssignment().getVendor().getId().equals(currentUser.getId());
        boolean isAdminOrFinance = role.equals("ADMIN") || role.equals("FINANCE");

        if (!isContractorOwner && !isHiringManager && !isVendor && !isAdminOrFinance) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view this timesheet.");
        }

        return toDto(timesheet);
    }

    @Override
    public List<TimesheetResponseDTO> searchTimesheets(TimesheetStatus status, String contractorUserId,
            String assignmentId) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUser.getRole().name();

        List<Timesheet> result;
        if (role.equals("ADMIN") || role.equals("FINANCE")) {
            result = timesheetRepository.findAll();
        } else if (role.equals("CONTRACTOR")) {
            result = timesheetRepository.findByContractorId(currentUser.getId());
        } else if (role.equals("HIRING_MANAGER")) {
            result = timesheetRepository.findAll().stream()
                    .filter(t -> t.getAssignment().getHiringManager().getId().equals(currentUser.getId()))
                    .collect(Collectors.toList());
        } else if (role.equals("VENDOR") || role.equals("VENDOR_MANAGER")) {
            result = timesheetRepository.findAll().stream()
                    .filter(t -> t.getAssignment().getVendor() != null
                            && t.getAssignment().getVendor().getId().equals(currentUser.getId()))
                    .collect(Collectors.toList());
        } else {
            throw new AccessDeniedException("Access Denied: Unauthorized role.");
        }

        // Apply filters
        return result.stream()
                .filter(t -> status == null || t.getStatus() == status)
                .filter(t -> contractorUserId == null || t.getContractor().getId().equals(contractorUserId))
                .filter(t -> assignmentId == null || t.getAssignment().getId().equals(assignmentId))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<TimesheetResponseDTO> getPayrollReadyTimesheets() {
        return timesheetRepository.findByStatusAndPayrollStatus(TimesheetStatus.APPROVED, PayrollStatus.NOT_PROCESSED)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void sweepPendingApprovals() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(3);
        List<Timesheet> l1Pending = timesheetRepository.findPendingTimesheetsOlderThan(TimesheetStatus.SUBMITTED,
                cutoff);
        for (Timesheet t : l1Pending) {
            // Trigger hiring manager reminder logging
            System.out.println(
                    "Reminder: Timesheet ID " + t.getId() + " is pending Hiring Manager approval for 3+ days.");
        }

        List<Timesheet> l2Pending = timesheetRepository.findPendingTimesheetsOlderThan(TimesheetStatus.PENDING_FINANCE,
                cutoff);
        for (Timesheet t : l2Pending) {
            // Trigger finance reminder logging
            System.out.println("Reminder: Timesheet ID " + t.getId() + " is pending Finance approval for 3+ days.");
        }
    }

    private List<TimesheetLine> validateAndPopulateLines(Timesheet timesheet, List<TimesheetLineRequestDTO> dtos,
            String profileId) {
        BigDecimal totalRegular = BigDecimal.ZERO;
        BigDecimal totalOvertime = BigDecimal.ZERO;
        List<TimesheetLine> lines = new ArrayList<>();

        // Fetch approved leave days overlapping this week
        List<ContractorAbsence> absences = absenceRepository.findApprovedAbsencesInRange(
                profileId,
                timesheet.getWeekStartDate(),
                timesheet.getWeekEndDate(),
                AbsenceStatus.APPROVED);

        for (TimesheetLineRequestDTO dto : dtos) {
            LocalDate workDate = dto.getWorkDate();

            // Validate date is within timesheet week range
            if (workDate.isBefore(timesheet.getWeekStartDate()) || workDate.isAfter(timesheet.getWeekEndDate())) {
                throw new IllegalArgumentException(
                        "Line work date " + workDate + " falls outside the timesheet week range.");
            }

            // Future date prevention
            if (workDate.isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Work date " + workDate + " cannot be in the future.");
            }

            BigDecimal totalHours = dto.getHoursWorked();
            BigDecimal regular;
            BigDecimal overtime;

            if (totalHours.compareTo(new BigDecimal("8.00")) > 0) {
                regular = new BigDecimal("8.00");
                overtime = totalHours.subtract(regular);
            } else {
                regular = totalHours;
                overtime = BigDecimal.ZERO;
            }

            // Daily limits checks
            if (totalHours.compareTo(new BigDecimal("24.00")) > 0) {
                throw new IllegalArgumentException("Daily hours on " + workDate + " cannot exceed 24 hours.");
            }

            // Check approved leave restrictions
            ContractorAbsence leave = absences.stream()
                    .filter(a -> !workDate.isBefore(a.getStartDate()) && !workDate.isAfter(a.getEndDate()))
                    .findFirst()
                    .orElse(null);

            if (leave != null) {
                // Determine if it represents a half day using explicit duration enum
                boolean isHalfDay = leave.getDuration() == AbsenceDuration.HALF_DAY;
                if (isHalfDay) {
                    // Half-day leave capping validation: hours logged must not exceed standard
                    // daily limits (e.g. 4 worked hours allowed max)
                    if (regular.add(overtime).compareTo(new BigDecimal("4.00")) > 0) {
                        throw new IllegalArgumentException(
                                "Cannot log more than 4 hours worked on a half-day leave on " + workDate);
                    }
                } else {
                    // Full-day leave capping validation: must contain 0 billable hours
                    if (regular.compareTo(BigDecimal.ZERO) > 0 || overtime.compareTo(BigDecimal.ZERO) > 0) {
                        throw new IllegalArgumentException(
                                "Leave days must contain 0 billable hours. Violation on " + workDate);
                    }
                }
            }

            totalRegular = totalRegular.add(regular);
            totalOvertime = totalOvertime.add(overtime);

            TimesheetLine line = TimesheetLine.builder()
                    .timesheet(timesheet)
                    .workDate(workDate)
                    .hoursWorked(regular)
                    .overtimeHours(overtime)
                    .activityDesc(dto.getActivityDesc())
//                    .absence(leave)
                    .build();

            lines.add(line);
        }

        // Weekly validations
        if (totalRegular.compareTo(new BigDecimal("40.00")) > 0) {
            throw new IllegalArgumentException("Weekly standard regular hours cannot exceed 40.00 hours.");
        }
        if (totalRegular.add(totalOvertime).compareTo(new BigDecimal("60.00")) > 0) {
            throw new IllegalArgumentException(
                    "Total weekly logged hours (standard + overtime) cannot exceed 60.00 hours.");
        }

        // Calculate billable amount strictly on backend using assignment
        // agreedRatePerDay
        BigDecimal agreedRate = timesheet.getAssignment().getAgreedRatePerDay();
        BigDecimal billableAmount = BigDecimal.ZERO;
        for (TimesheetLine line : lines) {
            // Daily billing: (LineHours + OvertimeHours * 1.5) / 8 * AgreedDailyRate
            BigDecimal dailyWeight = line.getHoursWorked().add(line.getOvertimeHours().multiply(new BigDecimal("1.5")));
            BigDecimal dailyCost = dailyWeight.divide(new BigDecimal("8.00"), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(agreedRate);
            billableAmount = billableAmount.add(dailyCost);
        }

        timesheet.setHoursLogged(totalRegular);
        timesheet.setOvertimeLogged(totalOvertime);
        timesheet.setBillableAmount(billableAmount.setScale(2, java.math.RoundingMode.HALF_UP));

        return lines;
    }

    private TimesheetResponseDTO toDto(Timesheet timesheet) {
        List<TimesheetLineResponseDTO> lineDtos = new ArrayList<>();
        List<TimesheetLine> lines = timesheetLineRepository.findByTimesheetId(timesheet.getId());
        for (TimesheetLine l : lines) {
            TimesheetLineResponseDTO dto = TimesheetLineResponseDTO.builder()
                    .id(l.getId())
                    .workDate(l.getWorkDate())
                    .hoursWorked(l.getHoursWorked())
                    .overtimeHours(l.getOvertimeHours())
                    .activityDesc(l.getActivityDesc())
//                    .absenceId(l.getAbsence() != null ? l.getAbsence().getId() : null)
                    .build();
            lineDtos.add(dto);
        }

        return TimesheetResponseDTO.builder()
                .id(timesheet.getId())
                .assignmentId(timesheet.getAssignment().getId())
                .contractorUserId(timesheet.getContractor().getId())
                .contractorName(timesheet.getContractor().getName())
                .weekStartDate(timesheet.getWeekStartDate())
                .weekEndDate(timesheet.getWeekEndDate())
                .hoursLogged(timesheet.getHoursLogged())
                .overtimeLogged(timesheet.getOvertimeLogged())
                .status(timesheet.getStatus())
                .payrollStatus(timesheet.getPayrollStatus())
                .billableAmount(timesheet.getBillableAmount())
                .submittedDate(timesheet.getSubmittedDate())
                .approvedByHiringManagerId(
                        timesheet.getApprovedByHiringManager() != null ? timesheet.getApprovedByHiringManager().getId()
                                : null)
                .approvedByFinanceId(
                        timesheet.getApprovedByFinance() != null ? timesheet.getApprovedByFinance().getId() : null)
                .approvedDate(timesheet.getApprovedDate())
                .payrollProcessedDate(timesheet.getPayrollProcessedDate())
                .lines(lineDtos)
                .build();
    }
}

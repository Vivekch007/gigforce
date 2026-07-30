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
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import com.gigforce.exception.BusinessValidationException;
import org.springframework.data.jpa.domain.Specification;

import com.gigforce.notification.publisher.NotificationPublisher;

@Service
@Transactional(readOnly = true)
public class TimesheetServiceImpl implements TimesheetService {

    @Value("${gigforce.timesheet.maxRegularHours:50.00}")
    private BigDecimal maxRegularHours;

    @Value("${gigforce.timesheet.maxTotalHours:60.00}")
    private BigDecimal maxTotalHours;

    // Hours per day beyond which the time is treated as overtime (requirement: 10h/day)
    @Value("${gigforce.timesheet.dailyRegularHours:10.00}")
    private BigDecimal dailyRegularHours;

    @Value("${gigforce.timesheet.maxDailyHours:24.00}")
    private BigDecimal maxDailyHours;

    // Standard workday used as the billing day-basis (unchanged, feeds Module 6 invoicing)
    private static final BigDecimal BILLING_DAY_BASIS = new BigDecimal("8.00");
    private static final BigDecimal OVERTIME_MULTIPLIER = new BigDecimal("1.5");

    private final TimesheetRepository timesheetRepository;
    private final ContractorProfileRepository contractorProfileRepository;
    private final TimesheetLineRepository timesheetLineRepository;
    private final TimesheetApprovalRepository timesheetApprovalRepository;
    private final TimesheetCommentRepository timesheetCommentRepository;
    private final ContractorAbsenceRepository absenceRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationPublisher notificationPublisher;

    public TimesheetServiceImpl(
            ContractorProfileRepository contractorProfileRepository,
            TimesheetRepository timesheetRepository,
            TimesheetLineRepository timesheetLineRepository,
            TimesheetApprovalRepository timesheetApprovalRepository,
            TimesheetCommentRepository timesheetCommentRepository,
            ContractorAbsenceRepository absenceRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            AuditService auditService,
            NotificationPublisher notificationPublisher) {
        this.timesheetRepository = timesheetRepository;
        this.timesheetLineRepository = timesheetLineRepository;
        this.timesheetApprovalRepository = timesheetApprovalRepository;
        this.timesheetCommentRepository = timesheetCommentRepository;
        this.absenceRepository = absenceRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationPublisher = notificationPublisher;
        this.contractorProfileRepository = contractorProfileRepository;
    }

    // ------------------------------------------------------------------
    // CREATE — backend pre-generates the Mon-Fri skeleton (empty lines)
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public TimesheetResponseDTO createTimesheet(com.gigforce.assignment.dto.TimesheetCreateRequestDTO request) {
        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new AssignmentNotFoundException(
                        "Assignment not found with ID: " + request.getAssignmentId()));

        User currentUser = getCurrentUser();

        // Authorization: Only Hiring Manager of the assignment (or ADMIN) may create a timesheet
        String role = currentUser.getRole().name();
        if (role.equals("HIRING_MANAGER")) {
            if (assignment.getHiringManager() == null || !assignment.getHiringManager().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You are not authorized to create a timesheet for this assignment.");
            }
        } else if (!role.equals("ADMIN")) {
            // All non-admin, non-hiring-manager users are forbidden
            throw new AccessDeniedException("Access Denied: Only the Hiring Manager or Admin can create timesheets.");
        }

        // Assignment status boundary check
        if (assignment.getStatus() != AssignmentStatus.ACTIVE && assignment.getStatus() != AssignmentStatus.EXTENDED) {
            throw new BusinessValidationException(
                    "Timesheets can only be created for ACTIVE or EXTENDED assignments. Current status: "
                            + assignment.getStatus());
        }

        // Week runs Monday -> Sunday; start must be a Monday
        if (request.getWeekStartDate().getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new BusinessValidationException("Timesheet week start date must be a MONDAY.");
        }

        // Enforce one assignment + one week -> one timesheet
        if (timesheetRepository.existsByAssignmentIdAndWeekStartDate(assignment.getId(), request.getWeekStartDate())) {
            throw new BusinessValidationException(
                    "A timesheet already exists for this assignment on the week starting: "
                            + request.getWeekStartDate());
        }

        ContractorProfile profile = assignment.getContractorProfile();
        LocalDate weekStart = request.getWeekStartDate();
        LocalDate weekEnd = weekStart.plusDays(6); // Sunday

        Timesheet timesheet = Timesheet.builder()
                .assignment(assignment)
                .contractor(profile)
                .weekStartDate(weekStart)
                .weekEndDate(weekEnd)
                .hoursLogged(BigDecimal.ZERO)
                .overtimeLogged(BigDecimal.ZERO)
                .billableAmount(BigDecimal.ZERO)
                .status(TimesheetStatus.DRAFT)
                .payrollStatus(PayrollStatus.NOT_PROCESSED)
                .orgUnitId(assignment.getOrgUnitId())
                .build();

        Timesheet saved = timesheetRepository.save(timesheet);

        // Pre-generate an empty line for each working day (Mon-Fri)
        List<TimesheetLine> skeleton = new ArrayList<>();
        for (LocalDate d = weekStart; !d.isAfter(weekEnd); d = d.plusDays(1)) {
            if (isWeekend(d)) {
                continue;
            }
            skeleton.add(TimesheetLine.builder()
                    .timesheet(saved)
                    .workDate(d)
                    .hoursWorked(BigDecimal.ZERO)
                    .overtimeHours(BigDecimal.ZERO)
                    .activityDesc(null)
                    .status(TimesheetStatus.DRAFT)
                    .build());
        }
        timesheetLineRepository.saveAll(skeleton);
        notificationPublisher.publishTimesheetGeneration(saved);
        auditService.logAction(
                currentUser.getId(),
                "TIMESHEET_CREATED",
                "Timesheet",
                saved.getId(),
                String.format("Weekly timesheet draft created for contractor %s for week %s (Mon-Fri lines pre-generated)",
                        profile.getUser().getEmail(), saved.getWeekStartDate()));

        return toDto(saved);
    }

    // ------------------------------------------------------------------
    // UPDATE — contractor fills hours + activity on the weekday lines
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public TimesheetResponseDTO updateTimesheet(String id, TimesheetUpdateRequestDTO request) {
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessValidationException("At least one day's hours must be provided to update the timesheet.");
        }

        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        // Immutability checks
        if (timesheet.getStatus() == TimesheetStatus.APPROVED
                || timesheet.getPayrollStatus() != PayrollStatus.NOT_PROCESSED) {
            throw new BusinessValidationException(
                    "Approved or processed timesheets are immutable and cannot be modified.");
        }

        if (timesheet.getStatus() != TimesheetStatus.DRAFT && timesheet.getStatus() != TimesheetStatus.REJECTED
                && timesheet.getStatus() != TimesheetStatus.REVISED) {
            throw new BusinessValidationException("Timesheet in status " + timesheet.getStatus() + " cannot be modified.");
        }

        User currentUser = getCurrentUser();
        if (currentUser.getRole().name().equals("CONTRACTOR")) {
            ContractorProfile cp = contractorProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new UserNotFoundException("Contractor profile not found for user: " + currentUser.getEmail()));
            if (!timesheet.getContractor().getId().equals(cp.getId())) {
                throw new AccessDeniedException("You are not authorized to update this timesheet.");
            }
        }

        boolean isRevised = timesheet.getStatus() == TimesheetStatus.REJECTED;
        if (isRevised) {
            timesheet.setStatus(TimesheetStatus.REVISED);
        }

        List<TimesheetLine> existingLines = timesheetLineRepository.findByTimesheetId(timesheet.getId());

        // Approved leave days overlapping this week
        List<ContractorAbsence> approvedAbsences = absenceRepository.findApprovedAbsencesInRange(
                timesheet.getContractor().getId(),
                timesheet.getWeekStartDate(),
                timesheet.getWeekEndDate(),
                AbsenceStatus.APPROVED);

        LocalDate weekStart = timesheet.getWeekStartDate();
        LocalDate weekEnd = timesheet.getWeekEndDate();

        // Map to keep track of total raw hours submitted per date
        Map<LocalDate, BigDecimal> rawDailyHoursMap = new HashMap<>();

        for (TimesheetLineRequestDTO dto : request.getLines()) {
            LocalDate workDate = dto.getWorkDate();

            if (workDate.isBefore(weekStart) || workDate.isAfter(weekEnd)) {
                throw new BusinessValidationException(
                        "Work date " + workDate + " falls outside the timesheet week (" + weekStart + " to " + weekEnd + ").");
            }

            if (workDate.isAfter(LocalDate.now())) {
                throw new BusinessValidationException("Work date " + workDate + " cannot be in the future.");
            }

            // Locate or dynamically create weekend line if needed
            TimesheetLine line = existingLines.stream()
                    .filter(l -> l.getWorkDate().equals(workDate))
                    .findFirst()
                    .orElseGet(() -> {
                        if (isWeekend(workDate)) {
                            TimesheetLine newLine = TimesheetLine.builder()
                                    .timesheet(timesheet)
                                    .workDate(workDate)
                                    .hoursWorked(BigDecimal.ZERO)
                                    .overtimeHours(BigDecimal.ZERO)
                                    .status(TimesheetStatus.DRAFT)
                                    .build();
                            existingLines.add(newLine);
                            return newLine;
                        }
                        throw new BusinessValidationException("No timesheet line exists for " + workDate + ".");
                    });

            BigDecimal totalHours = dto.getHoursWorked();
            if (totalHours == null || totalHours.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessValidationException("Hours worked cannot be negative on " + workDate + ".");
            }
            if (totalHours.compareTo(maxDailyHours) > 0) {
                throw new BusinessValidationException(
                        "Daily hours on " + workDate + " cannot exceed " + maxDailyHours + " hours.");
            }

            // Approved leave check => 0 hours
            boolean onApprovedLeave = approvedAbsences.stream()
                    .anyMatch(a -> !workDate.isBefore(a.getStartDate()) && !workDate.isAfter(a.getEndDate()));
            if (onApprovedLeave) {
                rawDailyHoursMap.put(workDate, BigDecimal.ZERO);
                line.setActivityDesc("On approved leave");
                continue;
            }

            if (totalHours.compareTo(BigDecimal.ZERO) > 0
                    && (dto.getActivityDesc() == null || dto.getActivityDesc().trim().isEmpty())) {
                throw new BusinessValidationException(
                        "Activity description is required for " + workDate + " when hours are logged.");
            }

            rawDailyHoursMap.put(workDate, totalHours);
            line.setActivityDesc(dto.getActivityDesc());
        }

        // Shift regular vs. overtime hours based on the cumulative 40-hour weekly threshold
        redistributeWeeklyHours(existingLines, rawDailyHoursMap);

        recomputeTotals(timesheet, existingLines);
        syncLineStatuses(timesheet, existingLines);
        timesheetLineRepository.saveAll(existingLines);
        Timesheet saved = timesheetRepository.save(timesheet);
        // Draft save — no notification published; submission notification fires in submitTimesheet()
        auditService.logAction(
                currentUser.getId(),
                isRevised ? "TIMESHEET_REVISED" : "TIMESHEET_UPDATED",
                "Timesheet",
                saved.getId(),
                String.format("Weekly timesheet %s for week %s by %s",
                        isRevised ? "revised" : "updated", saved.getWeekStartDate(), currentUser.getEmail()));

        return toDto(saved);
    }

    /**
     * Distributes regular vs. overtime hours chronologically (Mon -> Sun).
     * Caps regular hours at 40 total hours per week; all remaining hours become overtime.
     */
    private void redistributeWeeklyHours(List<TimesheetLine> existingLines, Map<LocalDate, BigDecimal> rawDailyHoursMap) {
        // Sort lines chronologically from Monday to Sunday
        existingLines.sort(Comparator.comparing(TimesheetLine::getWorkDate));

        BigDecimal weeklyCap = BigDecimal.valueOf(40);
        BigDecimal accumulatedRegularHours = BigDecimal.ZERO;

        for (TimesheetLine line : existingLines) {
            // Get raw total hours for the day (if not in update payload, preserve total existing hours)
            BigDecimal dailyTotal = rawDailyHoursMap.getOrDefault(
                    line.getWorkDate(),
                    line.getHoursWorked().add(line.getOvertimeHours())
            );

            // Calculate remaining capacity under the 40-hour weekly cap
            BigDecimal remainingCapacity = weeklyCap.subtract(accumulatedRegularHours).max(BigDecimal.ZERO);

            BigDecimal regularHours = dailyTotal.min(dailyRegularHours).min(remainingCapacity);
            BigDecimal overtimeHours = dailyTotal.subtract(regularHours);

            line.setHoursWorked(regularHours);
            line.setOvertimeHours(overtimeHours);

            accumulatedRegularHours = accumulatedRegularHours.add(regularHours);
        }
    }



    // ------------------------------------------------------------------
    // SUBMIT — backend stamps submitted date; status DRAFT/REVISED -> SUBMITTED
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public TimesheetResponseDTO submitTimesheet(String id) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        if (timesheet.getStatus() != TimesheetStatus.DRAFT && timesheet.getStatus() != TimesheetStatus.REVISED) {
            throw new BusinessValidationException(
                    "Only DRAFT or REVISED timesheets can be submitted. Current status: " + timesheet.getStatus());
        }

        List<TimesheetLine> lines = timesheetLineRepository.findByTimesheetId(timesheet.getId());
        if (lines.isEmpty()) {
            throw new BusinessValidationException("Contractor cannot submit an empty timesheet.");
        }

        BigDecimal totalHours = lines.stream()
                .map(l -> l.getHoursWorked().add(l.getOvertimeHours()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalHours.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Cannot submit a timesheet with zero total hours logged.");
        }

        User currentUser = getCurrentUser();
        if (currentUser.getRole().name().equals("CONTRACTOR")) {
            ContractorProfile cp = contractorProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new UserNotFoundException("Contractor profile not found for user: " + currentUser.getEmail()));
            if (!timesheet.getContractor().getId().equals(cp.getId())) {
                throw new AccessDeniedException("You are not authorized to submit this timesheet.");
            }
        }

        timesheet.setStatus(TimesheetStatus.SUBMITTED);
        timesheet.setSubmittedDate(LocalDateTime.now());
        syncLineStatuses(timesheet, lines);
        timesheetLineRepository.saveAll(lines);

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
                String.format("Timesheet submitted for contractor %s for week %s",
                        timesheet.getContractor().getUser().getEmail(), saved.getWeekStartDate()));

        notificationPublisher.publishTimesheetSubmission(saved);

        return toDto(saved);
    }

    // ------------------------------------------------------------------
    // APPROVE — single HR (Hiring Manager) step: SUBMITTED -> APPROVED
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public TimesheetResponseDTO approveTimesheet(String id, TimesheetApprovalRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        if (timesheet.getStatus() != TimesheetStatus.SUBMITTED) {
            throw new BusinessValidationException(
                    "Timesheet must be in SUBMITTED status to approve. Current status: " + timesheet.getStatus());
        }

        User currentUser = getCurrentUser();
        String role = currentUser.getRole().name();

        boolean isManager = role.equals("HIRING_MANAGER")
                && timesheet.getAssignment().getHiringManager() != null
                && timesheet.getAssignment().getHiringManager().getId().equals(currentUser.getId());
        boolean isAdmin = role.equals("ADMIN");
        if (!isManager && !isAdmin) {
            throw new AccessDeniedException("Access Denied: You are not authorized to approve this timesheet.");
        }

        timesheet.setStatus(TimesheetStatus.APPROVED);
        timesheet.setApprovedByHiringManager(currentUser);
        timesheet.setApprovedDate(LocalDateTime.now());

        List<TimesheetLine> lines = timesheetLineRepository.findByTimesheetId(timesheet.getId());
        syncLineStatuses(timesheet, lines);
        timesheetLineRepository.saveAll(lines);

        TimesheetApproval approval = TimesheetApproval.builder()
                .timesheet(timesheet)
                .approver(currentUser)
                .approvalLevel("HR_MANAGER")
                .action("APPROVED")
                .remarks(request != null && request.getRemarks() != null ? request.getRemarks()
                        : "Hiring Manager approved hours")
                .actionDate(LocalDateTime.now())
                .build();
        timesheetApprovalRepository.save(approval);

        Timesheet saved = timesheetRepository.save(timesheet);

        auditService.logAction(
                currentUser.getId(),
                "TIMESHEET_APPROVED",
                "Timesheet",
                saved.getId(),
                String.format("Timesheet approved by %s for contractor %s", currentUser.getEmail(),
                        timesheet.getContractor().getUser().getEmail()));

        notificationPublisher.publishTimesheetL2Approval(saved, currentUser);

        return toDto(saved);
    }

    // ------------------------------------------------------------------
    // REJECT — Hiring Manager / Admin rejects a SUBMITTED timesheet
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public TimesheetResponseDTO rejectTimesheet(String id, TimesheetApprovalRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        if (timesheet.getStatus() != TimesheetStatus.SUBMITTED) {
            throw new BusinessValidationException(
                    "Timesheet must be in SUBMITTED status to reject. Current status: " + timesheet.getStatus());
        }

        if (request == null || request.getRemarks() == null || request.getRemarks().trim().isEmpty()) {
            throw new BusinessValidationException("Rejection remarks are required.");
        }

        User currentUser = getCurrentUser();
        String role = currentUser.getRole().name();

        boolean isManager = role.equals("HIRING_MANAGER")
                && timesheet.getAssignment().getHiringManager() != null
                && timesheet.getAssignment().getHiringManager().getId().equals(currentUser.getId());
        boolean isAdmin = role.equals("ADMIN");
        if (!isManager && !isAdmin) {
            throw new AccessDeniedException("Access Denied: You are not authorized to reject this timesheet.");
        }

        timesheet.setStatus(TimesheetStatus.REJECTED);

        List<TimesheetLine> lines = timesheetLineRepository.findByTimesheetId(timesheet.getId());
        syncLineStatuses(timesheet, lines);
        timesheetLineRepository.saveAll(lines);

        TimesheetApproval approval = TimesheetApproval.builder()
                .timesheet(timesheet)
                .approver(currentUser)
                .approvalLevel("HR_MANAGER")
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
                        timesheet.getContractor().getUser().getEmail(), request.getRemarks()));

        notificationPublisher.publishTimesheetRejection(saved, currentUser);

        return toDto(saved);
    }

    @Override
    @Transactional
    public void addComment(String id, TimesheetCommentRequestDTO request) {
        Timesheet timesheet = timesheetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + id));

        User currentUser = getCurrentUser();

        if (timesheet.getStatus() != TimesheetStatus.REJECTED) {
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

        User currentUser = getCurrentUser();
        String role = currentUser.getRole().name();
        boolean isContractorOwner = role.equals("CONTRACTOR")
                && timesheet.getContractor().getUser().getId().equals(currentUser.getId());
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
    public List<TimesheetResponseDTO> searchTimesheets(
            String timesheetId,
            String contractorProfileId,
            String assignmentId,
            TimesheetStatus status,
            LocalDate weekStartDate,
            LocalDate weekEndDate,
            String orgUnitId) {
        User currentUser = getCurrentUser();
        String role = currentUser.getRole().name();
        String currentOrgUnitId = currentUser.getOrgUnitId();

        Specification<Timesheet> spec = Specification.where(null);

        if (role.equals("CONTRACTOR")) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractor").get("user").get("id"), currentUser.getId()));
        } else if (role.equals("HIRING_MANAGER")) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), currentOrgUnitId));
        } else if (role.equals("VENDOR") || role.equals("VENDOR_MANAGER")) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignment").get("vendor").get("orgUnitId"), currentOrgUnitId));
        } else if (role.equals("ADMIN") || role.equals("FINANCE")) {
            // Full access
        } else {
            throw new AccessDeniedException("Access Denied: Unauthorized role.");
        }

        if (timesheetId != null && !timesheetId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), timesheetId));
        }
        if (contractorProfileId != null && !contractorProfileId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractor").get("id"), contractorProfileId));
        }
        if (assignmentId != null && !assignmentId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignment").get("id"), assignmentId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (weekStartDate != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("weekStartDate"), weekStartDate));
        }
        if (weekEndDate != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("weekEndDate"), weekEndDate));
        }
        if (orgUnitId != null && !orgUnitId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), orgUnitId));
        }

        return timesheetRepository.findAll(spec, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "weekStartDate")).stream()
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
        List<Timesheet> pending = timesheetRepository.findPendingTimesheetsOlderThan(TimesheetStatus.SUBMITTED, cutoff);
        for (Timesheet t : pending) {
            System.out.println(
                    "Reminder: Timesheet ID " + t.getId() + " is pending Hiring Manager approval for 3+ days.");
        }
    }

    // ------------------------------------------------------------------
    // ABSENCE HOOK — zero out hours on approved-leave days & recompute
    // ------------------------------------------------------------------
    @Override
    @Transactional
    public void applyApprovedAbsence(String assignmentId, LocalDate startDate, LocalDate endDate) {
        List<Timesheet> timesheets = timesheetRepository.findByAssignmentId(assignmentId);
        for (Timesheet ts : timesheets) {
            // Never mutate approved/processed (immutable) timesheets
            if (ts.getStatus() == TimesheetStatus.APPROVED || ts.getPayrollStatus() != PayrollStatus.NOT_PROCESSED) {
                continue;
            }
            // Skip timesheets whose week does not overlap the absence range
            if (ts.getWeekStartDate().isAfter(endDate) || ts.getWeekEndDate().isBefore(startDate)) {
                continue;
            }

            List<TimesheetLine> lines = timesheetLineRepository.findByTimesheetId(ts.getId());
            boolean changed = false;
            for (TimesheetLine line : lines) {
                LocalDate d = line.getWorkDate();
                boolean inLeave = !d.isBefore(startDate) && !d.isAfter(endDate);
                if (inLeave && (line.getHoursWorked().signum() != 0 || line.getOvertimeHours().signum() != 0)) {
                    line.setHoursWorked(BigDecimal.ZERO);
                    line.setOvertimeHours(BigDecimal.ZERO);
                    line.setActivityDesc("On approved leave");
                    changed = true;
                }
            }

            if (changed) {
                recomputeTotals(ts, lines);
                timesheetLineRepository.saveAll(lines);
                timesheetRepository.save(ts);
            }
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    private User getCurrentUser() {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));
    }

    private boolean isWeekend(LocalDate d) {
        return d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
    }

    /** Splits a day's total hours into [regular, overtime] using the daily regular-hours threshold. */
    private BigDecimal[] splitRegularAndOvertime(BigDecimal totalHours) {
        if (totalHours.compareTo(dailyRegularHours) > 0) {
            return new BigDecimal[] { dailyRegularHours, totalHours.subtract(dailyRegularHours) };
        }
        return new BigDecimal[] { totalHours, BigDecimal.ZERO };
    }

    /** Recomputes weekly totals + billable amount from the current line set and enforces weekly caps. */
    private void recomputeTotals(Timesheet timesheet, List<TimesheetLine> lines) {
        BigDecimal totalRegular = BigDecimal.ZERO;
        BigDecimal totalOvertime = BigDecimal.ZERO;
        for (TimesheetLine line : lines) {
            totalRegular = totalRegular.add(line.getHoursWorked());
            totalOvertime = totalOvertime.add(line.getOvertimeHours());
        }

        if (totalRegular.compareTo(maxRegularHours) > 0) {
            throw new BusinessValidationException("Weekly regular hours cannot exceed " + maxRegularHours + " hours.");
        }
        if (totalRegular.add(totalOvertime).compareTo(maxTotalHours) > 0) {
            throw new BusinessValidationException(
                    "Total weekly logged hours (regular + overtime) cannot exceed " + maxTotalHours + " hours.");
        }

        BigDecimal agreedRate = timesheet.getAssignment().getAgreedRatePerDay();
        BigDecimal billableAmount = BigDecimal.ZERO;
        for (TimesheetLine line : lines) {
            BigDecimal dailyWeight = line.getHoursWorked()
                    .add(line.getOvertimeHours().multiply(OVERTIME_MULTIPLIER));
            BigDecimal dailyCost = dailyWeight.divide(BILLING_DAY_BASIS, 4, RoundingMode.HALF_UP)
                    .multiply(agreedRate);
            billableAmount = billableAmount.add(dailyCost);
        }

        timesheet.setHoursLogged(totalRegular);
        timesheet.setOvertimeLogged(totalOvertime);
        timesheet.setBillableAmount(billableAmount.setScale(2, RoundingMode.HALF_UP));
    }

    private void syncLineStatuses(Timesheet timesheet, List<TimesheetLine> lines) {
        for (TimesheetLine line : lines) {
            line.setStatus(timesheet.getStatus());
        }
    }

    private TimesheetResponseDTO toDto(Timesheet timesheet) {
        List<TimesheetLineResponseDTO> lineDtos = new ArrayList<>();
        List<TimesheetLine> lines = timesheetLineRepository.findByTimesheetId(timesheet.getId());
        for (TimesheetLine l : lines) {
            lineDtos.add(TimesheetLineResponseDTO.builder()
                    .id(l.getId())
                    .workDate(l.getWorkDate())
                    .hoursWorked(l.getHoursWorked())
                    .overtimeHours(l.getOvertimeHours())
                    .activityDesc(l.getActivityDesc())
                    .status(l.getStatus())
                    .build());
        }

        return TimesheetResponseDTO.builder()
                .id(timesheet.getId())
                .assignmentId(timesheet.getAssignment().getId())
                .contractorUserId(timesheet.getContractor().getId())
                .contractorName(timesheet.getContractor().getUser().getName())
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

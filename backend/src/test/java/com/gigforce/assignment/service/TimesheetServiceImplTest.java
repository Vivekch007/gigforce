package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.*;
import com.gigforce.assignment.entity.*;
import com.gigforce.assignment.enums.*;
import com.gigforce.assignment.repository.*;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.AssignmentNotFoundException;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.identity.entity.ContractorAbsence;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorAbsenceRepository;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.publisher.NotificationPublisher;
import com.gigforce.requisition.enums.EngagementType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 5 - Timesheet service tests.
 * Covers skeleton generation (Mon-Fri), 10h/day overtime split, single HR approval,
 * line-status mirroring, immutability, RBAC/ownership and the approved-absence auto-zero hook.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TimesheetServiceImplTest {

    @Mock private TimesheetRepository timesheetRepository;
    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private TimesheetLineRepository timesheetLineRepository;
    @Mock private TimesheetApprovalRepository timesheetApprovalRepository;
    @Mock private TimesheetCommentRepository timesheetCommentRepository;
    @Mock private ContractorAbsenceRepository absenceRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private NotificationPublisher notificationPublisher;

    @InjectMocks private TimesheetServiceImpl service;

    /** A known Monday safely in the past (2024-01-01 was a Monday). */
    private static final LocalDate MONDAY = LocalDate.of(2024, 1, 1);
    private static final LocalDate WEEK_END = MONDAY.plusDays(6); // Sunday

    private User contractorUser;
    private ContractorProfile profile;
    private User hiringManager;
    private User vendor;
    private User admin;
    private Assignment assignment;

    @BeforeEach
    void setUp() {
        // @Value-injected thresholds are not populated by Mockito; set them explicitly.
        ReflectionTestUtils.setField(service, "maxRegularHours", new BigDecimal("50.00"));
        ReflectionTestUtils.setField(service, "maxTotalHours", new BigDecimal("60.00"));
        ReflectionTestUtils.setField(service, "dailyRegularHours", new BigDecimal("10.00"));
        ReflectionTestUtils.setField(service, "maxDailyHours", new BigDecimal("24.00"));

        contractorUser = user("cu1", "arjun@x.com", UserRole.CONTRACTOR);
        profile = profile("p1", contractorUser, AvailabilityStatus.ON_ASSIGNMENT);
        hiringManager = user("hr1", "riya@x.com", UserRole.HIRING_MANAGER);
        vendor = user("v1", "sam@x.com", UserRole.VENDOR);
        admin = user("ad1", "admin@x.com", UserRole.ADMIN);
        assignment = assignment("a1", profile, hiringManager, vendor, AssignmentStatus.ACTIVE);
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    // ---------------- helpers ----------------

    private User user(String id, String email, UserRole role) {
        User u = User.builder().name("N-" + id).email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).orgUnitId("ORG1").build();
        u.setId(id);
        return u;
    }

    private void actingAs(User u) {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(u.getEmail(), null));
        SecurityContextHolder.setContext(ctx);
        when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
    }

    private ContractorProfile profile(String id, User u, AvailabilityStatus avail) {
        ContractorProfile p = ContractorProfile.builder().user(u).availabilityStatus(avail)
                .profileStatus(ProfileStatus.ACTIVE).build();
        p.setId(id);
        return p;
    }

    private Assignment assignment(String id, ContractorProfile p, User hm, User v, AssignmentStatus status) {
        Assignment a = Assignment.builder()
                .contractorProfile(p).hiringManager(hm).vendor(v).status(status)
                .startDate(MONDAY).endDate(MONDAY.plusYears(1))
                .agreedRatePerDay(new BigDecimal("1000.00"))
                .engagementType(EngagementType.REMOTE).orgUnitId("ORG1").build();
        a.setId(id);
        return a;
    }

    private Timesheet timesheet(String id, TimesheetStatus status, PayrollStatus payroll) {
        Timesheet t = Timesheet.builder()
                .assignment(assignment).contractor(profile)
                .weekStartDate(MONDAY).weekEndDate(WEEK_END)
                .hoursLogged(BigDecimal.ZERO).overtimeLogged(BigDecimal.ZERO).billableAmount(BigDecimal.ZERO)
                .status(status).payrollStatus(payroll).orgUnitId("ORG1").build();
        t.setId(id);
        return t;
    }

    private TimesheetLine line(Timesheet t, LocalDate date, String hours, String ot) {
        TimesheetLine l = TimesheetLine.builder()
                .timesheet(t).workDate(date)
                .hoursWorked(new BigDecimal(hours)).overtimeHours(new BigDecimal(ot))
                .activityDesc(null).status(t.getStatus()).build();
        l.setId("line-" + date);
        return l;
    }

    /** Five empty weekday skeleton lines Mon-Fri for the standard week. */
    private List<TimesheetLine> weekdaySkeleton(Timesheet t) {
        List<TimesheetLine> lines = new ArrayList<>();
        for (LocalDate d = MONDAY; !d.isAfter(MONDAY.plusDays(4)); d = d.plusDays(1)) {
            lines.add(line(t, d, "0", "0"));
        }
        return lines;
    }

    private TimesheetLineRequestDTO lineReq(LocalDate date, String hours, String activity) {
        return TimesheetLineRequestDTO.builder()
                .workDate(date).hoursWorked(hours == null ? null : new BigDecimal(hours))
                .activityDesc(activity).build();
    }

    // ===================================================================
    // createTimesheet
    // ===================================================================

    @Test
    void createTimesheet_generatesFiveWeekdaySkeletonLines_allDraft() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetRepository.existsByAssignmentIdAndWeekStartDate("a1", MONDAY)).thenReturn(false);
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> {
            Timesheet t = i.getArgument(0);
            t.setId("t1");
            return t;
        });
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(List.of());

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder()
                .assignmentId("a1").weekStartDate(MONDAY).build();

        TimesheetResponseDTO res = service.createTimesheet(dto);

        assertEquals(TimesheetStatus.DRAFT, res.getStatus());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TimesheetLine>> captor = ArgumentCaptor.forClass(List.class);
        verify(timesheetLineRepository).saveAll(captor.capture());
        List<TimesheetLine> skeleton = captor.getValue();

        assertEquals(5, skeleton.size(), "Only Mon-Fri lines should be generated");
        List<LocalDate> dates = skeleton.stream().map(TimesheetLine::getWorkDate).collect(Collectors.toList());
        assertEquals(List.of(MONDAY, MONDAY.plusDays(1), MONDAY.plusDays(2), MONDAY.plusDays(3), MONDAY.plusDays(4)), dates);
        assertTrue(skeleton.stream().noneMatch(l -> l.getWorkDate().getDayOfWeek() == DayOfWeek.SATURDAY
                || l.getWorkDate().getDayOfWeek() == DayOfWeek.SUNDAY));
        assertTrue(skeleton.stream().allMatch(l -> l.getStatus() == TimesheetStatus.DRAFT));
        assertTrue(skeleton.stream().allMatch(l -> l.getHoursWorked().signum() == 0));
        verify(auditService).logAction(eq("cu1"), eq("TIMESHEET_CREATED"), eq("Timesheet"), eq("t1"), anyString());
    }

    @Test
    void createTimesheet_assignmentNotFound_throws() {
        when(assignmentRepository.findById("x")).thenReturn(Optional.empty());
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("x").weekStartDate(MONDAY).build();
        assertThrows(AssignmentNotFoundException.class, () -> service.createTimesheet(dto));
    }

    @Test
    void createTimesheet_contractorNotOwner_denied() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        ContractorProfile other = profile("p2", contractorUser, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(other));

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY).build();
        assertThrows(AccessDeniedException.class, () -> service.createTimesheet(dto));
    }

    @Test
    void createTimesheet_assignmentNotActive_throws() {
        assignment.setStatus(AssignmentStatus.COMPLETED);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY).build();
        assertThrows(BusinessValidationException.class, () -> service.createTimesheet(dto));
    }

    @Test
    void createTimesheet_weekStartNotMonday_throws() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder()
                .assignmentId("a1").weekStartDate(MONDAY.plusDays(1)).build(); // Tuesday
        assertThrows(BusinessValidationException.class, () -> service.createTimesheet(dto));
    }

    @Test
    void createTimesheet_duplicateWeek_throws() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetRepository.existsByAssignmentIdAndWeekStartDate("a1", MONDAY)).thenReturn(true);

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY).build();
        assertThrows(BusinessValidationException.class, () -> service.createTimesheet(dto));
    }

    // ===================================================================
    // updateTimesheet
    // ===================================================================

    @Test
    void updateTimesheet_splitsOvertimeBeyondTenHours_andRecomputesTotals() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        List<TimesheetLine> lines = weekdaySkeleton(t);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(absenceRepository.findApprovedAbsencesInRange(eq("p1"), eq(MONDAY), eq(WEEK_END), eq(AbsenceStatus.APPROVED)))
                .thenReturn(List.of());
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "12", "Dev"), lineReq(MONDAY.plusDays(1), "8", "Test"))).build();

        service.updateTimesheet("t1", dto);

        TimesheetLine mon = lines.stream().filter(l -> l.getWorkDate().equals(MONDAY)).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("10").compareTo(mon.getHoursWorked()));
        assertEquals(0, new BigDecimal("2").compareTo(mon.getOvertimeHours()));
        assertEquals(0, new BigDecimal("18").compareTo(t.getHoursLogged())); // 10 + 8 regular
        assertEquals(0, new BigDecimal("2").compareTo(t.getOvertimeLogged()));
        assertTrue(t.getBillableAmount().signum() > 0);
        verify(auditService).logAction(eq("cu1"), eq("TIMESHEET_UPDATED"), eq("Timesheet"), eq("t1"), anyString());
    }

    @Test
    void updateTimesheet_rejectedMovesToRevised() {
        Timesheet t = timesheet("t1", TimesheetStatus.REJECTED, PayrollStatus.NOT_PROCESSED);
        List<TimesheetLine> lines = weekdaySkeleton(t);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "Dev"))).build();

        service.updateTimesheet("t1", dto);

        assertEquals(TimesheetStatus.REVISED, t.getStatus());
        assertTrue(lines.stream().allMatch(l -> l.getStatus() == TimesheetStatus.REVISED));
        verify(auditService).logAction(eq("cu1"), eq("TIMESHEET_REVISED"), eq("Timesheet"), eq("t1"), anyString());
    }

    @Test
    void updateTimesheet_approvedLeaveDay_forcesZeroHours() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        List<TimesheetLine> lines = weekdaySkeleton(t);
        ContractorAbsence leave = ContractorAbsence.builder()
                .contractorProfile(profile).assignment(assignment)
                .startDate(MONDAY).endDate(MONDAY).status(AbsenceStatus.APPROVED)
                .absenceType(AbsenceType.SICK_LEAVE).reason("flu").build();
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(absenceRepository.findApprovedAbsencesInRange(eq("p1"), eq(MONDAY), eq(WEEK_END), eq(AbsenceStatus.APPROVED)))
                .thenReturn(List.of(leave));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        // Contractor tries to log 8h on an approved-leave day; backend must zero it out.
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "Work"))).build();

        service.updateTimesheet("t1", dto);

        TimesheetLine mon = lines.stream().filter(l -> l.getWorkDate().equals(MONDAY)).findFirst().orElseThrow();
        assertEquals(0, mon.getHoursWorked().signum());
        assertEquals(0, mon.getOvertimeHours().signum());
        assertEquals("On approved leave", mon.getActivityDesc());
    }

    @Test
    void updateTimesheet_emptyLines_throws() {
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of()).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_approvedTimesheetIsImmutable_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.APPROVED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_payrollProcessedIsImmutable_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_submittedNotEditable_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_contractorNotOwner_denied() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1"))
                .thenReturn(Optional.of(profile("p2", contractorUser, AvailabilityStatus.AVAILABLE)));

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "Dev"))).build();
        assertThrows(AccessDeniedException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_dateWithoutSkeletonLine_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(weekdaySkeleton(t));
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());

        // Saturday has no skeleton line
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY.plusDays(5), "8", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_futureDate_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        LocalDate future = LocalDate.now().plusDays(3);
        List<TimesheetLine> lines = new ArrayList<>(List.of(line(t, future, "0", "0")));
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(future, "8", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_negativeHours_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(weekdaySkeleton(t));
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "-1", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_exceedsDailyMax_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(weekdaySkeleton(t));
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "25", "Dev"))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_hoursWithoutActivityDesc_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(weekdaySkeleton(t));
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());

        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY)
                .lines(List.of(lineReq(MONDAY, "8", "  "))).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    @Test
    void updateTimesheet_weeklyTotalCapExceeded_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(weekdaySkeleton(t));
        when(absenceRepository.findApprovedAbsencesInRange(any(), any(), any(), any())).thenReturn(List.of());

        // 5 weekdays x 13h = 65h total > 60h weekly cap
        List<TimesheetLineRequestDTO> reqs = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            reqs.add(lineReq(MONDAY.plusDays(i), "13", "Dev"));
        }
        TimesheetRequestDTO dto = TimesheetRequestDTO.builder().assignmentId("a1").weekStartDate(MONDAY).lines(reqs).build();
        assertThrows(BusinessValidationException.class, () -> service.updateTimesheet("t1", dto));
    }

    // ===================================================================
    // submitTimesheet
    // ===================================================================

    @Test
    void submitTimesheet_success_stampsDate_syncsLineStatus_notifies() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        List<TimesheetLine> lines = new ArrayList<>(List.of(line(t, MONDAY, "8", "0")));
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1")).thenReturn(Optional.of(profile));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        service.submitTimesheet("t1");

        assertEquals(TimesheetStatus.SUBMITTED, t.getStatus());
        assertNotNull(t.getSubmittedDate());
        assertTrue(lines.stream().allMatch(l -> l.getStatus() == TimesheetStatus.SUBMITTED));
        verify(timesheetApprovalRepository).save(any(TimesheetApproval.class));
        verify(notificationPublisher).publishTimesheetSubmission(t);
        verify(auditService).logAction(eq("cu1"), eq("TIMESHEET_SUBMITTED"), eq("Timesheet"), eq("t1"), anyString());
    }

    @Test
    void submitTimesheet_zeroHours_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(weekdaySkeleton(t)); // all zero
        assertThrows(BusinessValidationException.class, () -> service.submitTimesheet("t1"));
    }

    @Test
    void submitTimesheet_wrongStatus_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.APPROVED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        assertThrows(BusinessValidationException.class, () -> service.submitTimesheet("t1"));
    }

    @Test
    void submitTimesheet_notOwner_denied() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        when(timesheetLineRepository.findByTimesheetId("t1"))
                .thenReturn(new ArrayList<>(List.of(line(t, MONDAY, "8", "0"))));
        actingAs(contractorUser);
        when(contractorProfileRepository.findByUserId("cu1"))
                .thenReturn(Optional.of(profile("p2", contractorUser, AvailabilityStatus.AVAILABLE)));
        assertThrows(AccessDeniedException.class, () -> service.submitTimesheet("t1"));
    }

    // ===================================================================
    // approveTimesheet (single HR step)
    // ===================================================================

    @Test
    void approveTimesheet_byOwningHiringManager_setsApproved() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        List<TimesheetLine> lines = new ArrayList<>(List.of(line(t, MONDAY, "8", "0")));
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(hiringManager);
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        service.approveTimesheet("t1", TimesheetApprovalRequestDTO.builder().remarks("ok").build());

        assertEquals(TimesheetStatus.APPROVED, t.getStatus());
        assertEquals(hiringManager, t.getApprovedByHiringManager());
        assertNotNull(t.getApprovedDate());
        assertTrue(lines.stream().allMatch(l -> l.getStatus() == TimesheetStatus.APPROVED));
        verify(auditService).logAction(eq("hr1"), eq("TIMESHEET_APPROVED"), eq("Timesheet"), eq("t1"), anyString());
        verify(notificationPublisher).publishTimesheetL2Approval(eq(t), eq(hiringManager));
    }

    @Test
    void approveTimesheet_byAdmin_setsApproved() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(admin);
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(new ArrayList<>(List.of(line(t, MONDAY, "8", "0"))));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        service.approveTimesheet("t1", null);
        assertEquals(TimesheetStatus.APPROVED, t.getStatus());
    }

    @Test
    void approveTimesheet_notSubmitted_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        assertThrows(BusinessValidationException.class, () -> service.approveTimesheet("t1", null));
    }

    @Test
    void approveTimesheet_nonOwningManager_denied() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(user("hr2", "other@x.com", UserRole.HIRING_MANAGER));
        assertThrows(AccessDeniedException.class, () -> service.approveTimesheet("t1", null));
    }

    @Test
    void approveTimesheet_financeRole_denied() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(user("f1", "fin@x.com", UserRole.FINANCE));
        assertThrows(AccessDeniedException.class, () -> service.approveTimesheet("t1", null));
    }

    // ===================================================================
    // rejectTimesheet
    // ===================================================================

    @Test
    void rejectTimesheet_success_setsRejected_syncsLines_notifies() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        List<TimesheetLine> lines = new ArrayList<>(List.of(line(t, MONDAY, "8", "0")));
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(hiringManager);
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        service.rejectTimesheet("t1", TimesheetApprovalRequestDTO.builder().remarks("hours look wrong").build());

        assertEquals(TimesheetStatus.REJECTED, t.getStatus());
        assertTrue(lines.stream().allMatch(l -> l.getStatus() == TimesheetStatus.REJECTED));
        verify(notificationPublisher).publishTimesheetRejection(eq(t), eq(hiringManager));
        verify(auditService).logAction(eq("hr1"), eq("TIMESHEET_REJECTED"), eq("Timesheet"), eq("t1"), anyString());
    }

    @Test
    void rejectTimesheet_notSubmitted_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        assertThrows(BusinessValidationException.class,
                () -> service.rejectTimesheet("t1", TimesheetApprovalRequestDTO.builder().remarks("x").build()));
    }

    @Test
    void rejectTimesheet_missingRemarks_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        assertThrows(BusinessValidationException.class,
                () -> service.rejectTimesheet("t1", TimesheetApprovalRequestDTO.builder().remarks("  ").build()));
    }

    @Test
    void rejectTimesheet_unauthorized_denied() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(user("hr2", "other@x.com", UserRole.HIRING_MANAGER));
        assertThrows(AccessDeniedException.class,
                () -> service.rejectTimesheet("t1", TimesheetApprovalRequestDTO.builder().remarks("no").build()));
    }

    // ===================================================================
    // addComment
    // ===================================================================

    @Test
    void addComment_onRejected_saved() {
        Timesheet t = timesheet("t1", TimesheetStatus.REJECTED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);

        service.addComment("t1", TimesheetCommentRequestDTO.builder().comment("Fixed hours").build());

        verify(timesheetCommentRepository).save(any(TimesheetComment.class));
    }

    @Test
    void addComment_notRejected_throws() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(contractorUser);
        assertThrows(IllegalStateException.class,
                () -> service.addComment("t1", TimesheetCommentRequestDTO.builder().comment("x").build()));
    }

    // ===================================================================
    // getTimesheetById (RBAC)
    // ===================================================================

    @Test
    void getTimesheetById_ownerContractor_ok() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(List.of());
        actingAs(contractorUser);

        TimesheetResponseDTO res = service.getTimesheetById("t1");
        assertEquals("t1", res.getId());
    }

    @Test
    void getTimesheetById_otherContractor_denied() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findById("t1")).thenReturn(Optional.of(t));
        actingAs(user("cu2", "mallory@x.com", UserRole.CONTRACTOR));
        assertThrows(AccessDeniedException.class, () -> service.getTimesheetById("t1"));
    }

    // ===================================================================
    // applyApprovedAbsence hook
    // ===================================================================

    @Test
    void applyApprovedAbsence_zeroesOverlappingEditableTimesheet_andRecomputes() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        t.setHoursLogged(new BigDecimal("8"));
        List<TimesheetLine> lines = new ArrayList<>(List.of(
                line(t, MONDAY, "8", "0"), line(t, MONDAY.plusDays(1), "0", "0")));
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of(t));
        when(timesheetLineRepository.findByTimesheetId("t1")).thenReturn(lines);
        when(timesheetLineRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));

        service.applyApprovedAbsence("a1", MONDAY, MONDAY);

        TimesheetLine mon = lines.get(0);
        assertEquals(0, mon.getHoursWorked().signum());
        assertEquals("On approved leave", mon.getActivityDesc());
        assertEquals(0, t.getHoursLogged().signum());
        verify(timesheetRepository).save(t);
    }

    @Test
    void applyApprovedAbsence_skipsApprovedTimesheet() {
        Timesheet t = timesheet("t1", TimesheetStatus.APPROVED, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of(t));

        service.applyApprovedAbsence("a1", MONDAY, MONDAY);

        verify(timesheetRepository, never()).save(any(Timesheet.class));
        verify(timesheetLineRepository, never()).saveAll(any());
    }

    @Test
    void applyApprovedAbsence_skipsNonOverlappingWeek() {
        Timesheet t = timesheet("t1", TimesheetStatus.DRAFT, PayrollStatus.NOT_PROCESSED);
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of(t));

        // Absence far outside the timesheet week
        service.applyApprovedAbsence("a1", MONDAY.plusMonths(2), MONDAY.plusMonths(2).plusDays(1));

        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }

    @Test
    void applyApprovedAbsence_skipsPayrollProcessedTimesheet() {
        Timesheet t = timesheet("t1", TimesheetStatus.SUBMITTED, PayrollStatus.PROCESSED);
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of(t));

        service.applyApprovedAbsence("a1", MONDAY, MONDAY);

        verify(timesheetRepository, never()).save(any(Timesheet.class));
    }
}

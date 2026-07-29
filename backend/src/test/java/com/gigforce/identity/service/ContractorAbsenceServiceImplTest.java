package com.gigforce.identity.service;

import com.gigforce.assignment.dto.AbsenceRequestDTO;
import com.gigforce.assignment.dto.AbsenceResponseDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AbsenceDuration;
import com.gigforce.assignment.enums.AbsenceStatus;
import com.gigforce.assignment.enums.AbsenceType;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.service.TimesheetService;
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
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.enums.EngagementType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 5 - Contractor absence / leave service tests.
 * Covers request validation, overlap detection, approve/reject RBAC and the
 * approved-leave -> timesheet auto-zero side effect.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ContractorAbsenceServiceImplTest {

    @Mock private ContractorAbsenceRepository absenceRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private TimesheetService timesheetService;

    @InjectMocks private ContractorAbsenceServiceImpl service;

    private static final LocalDate ASSIGN_START = LocalDate.of(2024, 1, 1);
    private static final LocalDate ASSIGN_END = LocalDate.of(2024, 12, 31);
    private static final LocalDate LEAVE_START = LocalDate.of(2024, 3, 4);
    private static final LocalDate LEAVE_END = LocalDate.of(2024, 3, 5);

    private User contractorUser;
    private ContractorProfile profile;
    private User hiringManager;
    private User vendor;
    private Assignment assignment;

    @BeforeEach
    void setUp() {
        contractorUser = user("cu1", "arjun@x.com", UserRole.CONTRACTOR);
        profile = profile("p1", contractorUser);
        hiringManager = user("hr1", "riya@x.com", UserRole.HIRING_MANAGER);
        vendor = user("v1", "sam@x.com", UserRole.VENDOR);
        assignment = assignment("a1", profile, hiringManager, vendor);
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

    private ContractorProfile profile(String id, User u) {
        ContractorProfile p = ContractorProfile.builder().user(u).availabilityStatus(AvailabilityStatus.ON_ASSIGNMENT)
                .profileStatus(ProfileStatus.ACTIVE).build();
        p.setId(id);
        return p;
    }

    private Assignment assignment(String id, ContractorProfile p, User hm, User v) {
        Assignment a = Assignment.builder()
                .contractorProfile(p).hiringManager(hm).vendor(v).status(AssignmentStatus.ACTIVE)
                .startDate(ASSIGN_START).endDate(ASSIGN_END)
                .agreedRatePerDay(new BigDecimal("1000.00"))
                .engagementType(EngagementType.REMOTE).orgUnitId("ORG1").build();
        a.setId(id);
        return a;
    }

    private ContractorAbsence absence(String id, AbsenceStatus status) {
        ContractorAbsence ab = ContractorAbsence.builder()
                .contractorProfile(profile).assignment(assignment)
                .startDate(LEAVE_START).endDate(LEAVE_END)
                .absenceType(AbsenceType.CASUAL_LEAVE).duration(AbsenceDuration.FULL_DAY)
                .reason("personal").status(status).orgUnitId("ORG1").build();
        ab.setId(id);
        return ab;
    }

    private AbsenceRequestDTO reqDto(LocalDate start, LocalDate end) {
        return AbsenceRequestDTO.builder()
                .assignmentId("a1").startDate(start).endDate(end)
                .absenceType(AbsenceType.CASUAL_LEAVE).duration(AbsenceDuration.FULL_DAY).reason("personal").build();
    }

    // ===================================================================
    // requestLeave
    // ===================================================================

    @Test
    void requestLeave_success_createsPending_audits() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        when(absenceRepository.findOverlappingAbsences(eq("p1"), any(), any(), any())).thenReturn(List.of());
        when(absenceRepository.save(any(ContractorAbsence.class))).thenAnswer(i -> {
            ContractorAbsence a = i.getArgument(0);
            a.setId("ab1");
            return a;
        });

        AbsenceResponseDTO res = service.requestLeave(reqDto(LEAVE_START, LEAVE_END));

        assertEquals(AbsenceStatus.PENDING, res.getStatus());
        verify(auditService).logAction(eq("cu1"), eq("ABSENCE_CREATED"), eq("ContractorAbsence"), eq("ab1"), anyString());
    }

    @Test
    void requestLeave_endBeforeStart_throws() {
        assertThrows(BusinessValidationException.class,
                () -> service.requestLeave(reqDto(LEAVE_END, LEAVE_START)));
    }

    @Test
    void requestLeave_assignmentNotFound_throws() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.empty());
        assertThrows(AssignmentNotFoundException.class, () -> service.requestLeave(reqDto(LEAVE_START, LEAVE_END)));
    }

    @Test
    void requestLeave_outsideAssignmentDuration_throws() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        // Leave a year before the assignment starts
        assertThrows(BusinessValidationException.class,
                () -> service.requestLeave(reqDto(ASSIGN_START.minusYears(1), ASSIGN_START.minusYears(1).plusDays(1))));
    }

    @Test
    void requestLeave_nonOwnerContractor_denied() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(user("cu2", "mallory@x.com", UserRole.CONTRACTOR));
        assertThrows(AccessDeniedException.class, () -> service.requestLeave(reqDto(LEAVE_START, LEAVE_END)));
    }

    @Test
    void requestLeave_overlappingExisting_throws() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        actingAs(contractorUser);
        when(absenceRepository.findOverlappingAbsences(eq("p1"), any(), any(), any()))
                .thenReturn(List.of(absence("ab0", AbsenceStatus.PENDING)));
        assertThrows(BusinessValidationException.class, () -> service.requestLeave(reqDto(LEAVE_START, LEAVE_END)));
    }

    // ===================================================================
    // approveLeave (+ timesheet auto-zero hook)
    // ===================================================================

    @Test
    void approveLeave_success_setsApproved_andTriggersTimesheetZeroing() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(hiringManager);
        when(absenceRepository.save(any(ContractorAbsence.class))).thenAnswer(i -> i.getArgument(0));

        AbsenceResponseDTO res = service.approveLeave("ab1");

        assertEquals(AbsenceStatus.APPROVED, res.getStatus());
        assertEquals(hiringManager, ab.getApprovedBy());
        assertNotNull(ab.getApprovedDate());
        verify(timesheetService).applyApprovedAbsence("a1", LEAVE_START, LEAVE_END);
        verify(auditService).logAction(eq("hr1"), eq("ABSENCE_APPROVED"), eq("ContractorAbsence"), eq("ab1"), anyString());
    }

    @Test
    void approveLeave_notPending_throws() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.APPROVED);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(hiringManager);
        assertThrows(BusinessValidationException.class, () -> service.approveLeave("ab1"));
        verify(timesheetService, never()).applyApprovedAbsence(any(), any(), any());
    }

    @Test
    void approveLeave_nonOwningManager_denied() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(user("hr2", "other@x.com", UserRole.HIRING_MANAGER));
        assertThrows(AccessDeniedException.class, () -> service.approveLeave("ab1"));
        verify(timesheetService, never()).applyApprovedAbsence(any(), any(), any());
    }

    // ===================================================================
    // rejectLeave
    // ===================================================================

    @Test
    void rejectLeave_success_setsRejected() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(hiringManager);
        when(absenceRepository.save(any(ContractorAbsence.class))).thenAnswer(i -> i.getArgument(0));

        AbsenceResponseDTO res = service.rejectLeave("ab1", "not enough coverage");

        assertEquals(AbsenceStatus.REJECTED, res.getStatus());
        assertEquals("not enough coverage", ab.getRejectionRemarks());
        verify(timesheetService, never()).applyApprovedAbsence(any(), any(), any());
    }

    @Test
    void rejectLeave_notPending_throws() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.REJECTED);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(hiringManager);
        assertThrows(BusinessValidationException.class, () -> service.rejectLeave("ab1", "x"));
    }

    @Test
    void rejectLeave_missingRemarks_throws() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(hiringManager);
        assertThrows(BusinessValidationException.class, () -> service.rejectLeave("ab1", "  "));
    }

    @Test
    void rejectLeave_unauthorized_denied() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(user("hr2", "other@x.com", UserRole.HIRING_MANAGER));
        assertThrows(AccessDeniedException.class, () -> service.rejectLeave("ab1", "no"));
    }

    // ===================================================================
    // getLeaveById (RBAC)
    // ===================================================================

    @Test
    void getLeaveById_ownerContractor_ok() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(contractorUser);

        AbsenceResponseDTO res = service.getLeaveById("ab1");
        assertEquals("ab1", res.getId());
    }

    @Test
    void getLeaveById_otherContractor_denied() {
        ContractorAbsence ab = absence("ab1", AbsenceStatus.PENDING);
        when(absenceRepository.findById("ab1")).thenReturn(Optional.of(ab));
        actingAs(user("cu2", "mallory@x.com", UserRole.CONTRACTOR));
        assertThrows(AccessDeniedException.class, () -> service.getLeaveById("ab1"));
    }
}

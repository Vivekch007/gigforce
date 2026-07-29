package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.AmendmentRequestDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.AssignmentAmendment;
import com.gigforce.assignment.enums.AmendmentStatus;
import com.gigforce.assignment.enums.AmendmentType;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.AmendmentNotFoundException;
import com.gigforce.exception.AssignmentNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.service.NotificationService;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.assignment.repository.AssignmentAmendmentRepository;
import com.gigforce.assignment.repository.AssignmentRepository;
import org.junit.jupiter.api.AfterEach;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 4 - Amendment service tests (vendor create, HR approve, each type's validation, availability linkage).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssignmentAmendmentServiceImplTest {

    @Mock private AssignmentAmendmentRepository amendmentRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private EngagementHistoryRepository engagementHistoryRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private NotificationService notificationService;

    @InjectMocks private AssignmentAmendmentServiceImpl service;

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private User user(String id, String email, UserRole role) {
        User u = User.builder().name("N").email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).build();
        u.setId(id);
        return u;
    }

    private void actingAs(User u) {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(u.getEmail(), null));
        SecurityContextHolder.setContext(ctx);
        when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
    }

    private ResourceRequisition req(String id, User creator) {
        ResourceRequisition r = ResourceRequisition.builder()
                .title("Java Dev").status(RequisitionStatus.OPEN).creator(creator).engagementType(EngagementType.REMOTE)
                .build();
        r.setId(id);
        return r;
    }

    private ContractorProfile profile(String id) {
        User cu = user("cu-" + id, "c" + id + "@x.com", UserRole.CONTRACTOR);
        ContractorProfile p = ContractorProfile.builder().user(cu).availabilityStatus(AvailabilityStatus.ON_ASSIGNMENT)
                .profileStatus(ProfileStatus.ACTIVE).build();
        p.setId(id);
        return p;
    }

    private Assignment assignment(String id, User hiringManager, User vendor, ResourceRequisition r,
                                   ContractorProfile p, LocalDate start, LocalDate end) {
        Assignment a = Assignment.builder().requisition(r).contractorProfile(p).hiringManager(hiringManager)
                .vendor(vendor).status(AssignmentStatus.ACTIVE).startDate(start).endDate(end)
                .agreedRatePerDay(new BigDecimal("100")).build();
        a.setId(id);
        return a;
    }

    private AmendmentRequestDTO amendmentDto(AmendmentType type, String newValue, LocalDate effectiveDate) {
        return AmendmentRequestDTO.builder()
                .amendmentType(type).newValue(newValue).effectiveDate(effectiveDate).remarks("test").build();
    }

    // ---------- createAmendment ----------

    @Test
    void createAmendment_byAssignedVendor_succeeds() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(sam);
        when(amendmentRepository.save(any(AssignmentAmendment.class))).thenAnswer(i -> {
            AssignmentAmendment am = i.getArgument(0);
            am.setId("am1");
            return am;
        });

        service.createAmendment("a1",
                amendmentDto(AmendmentType.RATE_REVISION, "110", LocalDate.now()));

        verify(auditService).logAction(anyString(), eq("ASSIGNMENT_AMENDMENT_CREATED"), anyString(), anyString(),
                anyString());
    }

    @Test
    void createAmendment_nonAssignedVendor_denied() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        User otherVendor = user("v2", "other@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(otherVendor);

        assertThrows(AccessDeniedException.class, () -> service.createAmendment("a1",
                amendmentDto(AmendmentType.RATE_REVISION, "110", LocalDate.now())));
    }

    @Test
    void createAmendment_byHiringManager_denied() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(riya);

        assertThrows(AccessDeniedException.class, () -> service.createAmendment("a1",
                amendmentDto(AmendmentType.RATE_REVISION, "110", LocalDate.now())));
    }

    @Test
    void createAmendment_extension_invalidDateThrows() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(sam);

        assertThrows(IllegalArgumentException.class, () -> service.createAmendment("a1",
                amendmentDto(AmendmentType.EXTENSION, end.minusDays(1).toString(), LocalDate.now())));
    }

    @Test
    void createAmendment_rateRevision_negativeThrows() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(sam);

        assertThrows(IllegalArgumentException.class, () -> service.createAmendment("a1",
                amendmentDto(AmendmentType.RATE_REVISION, "-50", LocalDate.now())));
    }

    @Test
    void createAmendment_earlyTermination_invalidDateThrows() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(sam);

        assertThrows(IllegalArgumentException.class, () -> service.createAmendment("a1",
                amendmentDto(AmendmentType.EARLY_TERMINATION, start.minusDays(1).toString(), LocalDate.now())));
    }

    // ---------- approveAmendment ----------

    @Test
    void approveAmendment_extension_byOwningHr_updatesEndDateAndSetsEXTENDED() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        LocalDate newEnd = end.plusDays(30);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);
        AssignmentAmendment am = AssignmentAmendment.builder().assignment(a)
                .amendmentType(AmendmentType.EXTENSION).newValue(newEnd.toString()).status(AmendmentStatus.PENDING)
                .build();
        am.setId("am1");

        when(amendmentRepository.findById("am1")).thenReturn(Optional.of(am));
        actingAs(riya);
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(i -> i.getArgument(0));
        when(amendmentRepository.save(any(AssignmentAmendment.class))).thenAnswer(i -> i.getArgument(0));
        when(amendmentRepository.findByAssignmentIdAndStatus("a1", AmendmentStatus.PENDING))
                .thenReturn(java.util.List.of());

        service.approveAmendment("am1", "approved");

        assertEquals(newEnd, a.getEndDate());
        assertEquals(AssignmentStatus.EXTENDED, a.getStatus());
        assertEquals(AmendmentStatus.APPROVED, am.getStatus());
        assertEquals(riya.getId(), am.getApprovedBy().getId());
    }

    @Test
    void approveAmendment_rateRevision_updatesRate() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);
        AssignmentAmendment am = AssignmentAmendment.builder().assignment(a)
                .amendmentType(AmendmentType.RATE_REVISION).newValue("150").status(AmendmentStatus.PENDING).build();

        when(amendmentRepository.findById("am1")).thenReturn(Optional.of(am));
        actingAs(riya);
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(i -> i.getArgument(0));
        when(amendmentRepository.save(any(AssignmentAmendment.class))).thenAnswer(i -> i.getArgument(0));
        when(amendmentRepository.findByAssignmentIdAndStatus("a1", AmendmentStatus.PENDING))
                .thenReturn(java.util.List.of());

        service.approveAmendment("am1", null);

        assertEquals(new BigDecimal("150"), a.getAgreedRatePerDay());
    }

    @Test
    void approveAmendment_earlyTermination_setsTerminatedAndReleasesContractor() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        LocalDate termDate = LocalDate.now();
        Assignment a = assignment("a1", riya, sam, r, p, start, end);
        AssignmentAmendment am = AssignmentAmendment.builder().assignment(a)
                .amendmentType(AmendmentType.EARLY_TERMINATION).newValue(termDate.toString())
                .status(AmendmentStatus.PENDING).build();

        when(amendmentRepository.findById("am1")).thenReturn(Optional.of(am));
        actingAs(riya);
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(i -> i.getArgument(0));
        when(amendmentRepository.save(any(AssignmentAmendment.class))).thenAnswer(i -> i.getArgument(0));
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(engagementHistoryRepository.save(any(EngagementHistory.class))).thenAnswer(i -> i.getArgument(0));
        when(amendmentRepository.findByAssignmentIdAndStatus("a1", AmendmentStatus.PENDING))
                .thenReturn(java.util.List.of());

        service.approveAmendment("am1", null);

        assertEquals(termDate, a.getEndDate());
        assertEquals(AssignmentStatus.TERMINATED_EARLY, a.getStatus());
        assertEquals(AvailabilityStatus.AVAILABLE, p.getAvailabilityStatus());
        verify(engagementHistoryRepository).save(any(EngagementHistory.class));
    }

    @Test
    void approveAmendment_nonOwningHr_denied() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User otherHr = user("hr2", "other@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);
        AssignmentAmendment am = AssignmentAmendment.builder().assignment(a)
                .amendmentType(AmendmentType.RATE_REVISION).newValue("150").status(AmendmentStatus.PENDING).build();

        when(amendmentRepository.findById("am1")).thenReturn(Optional.of(am));
        actingAs(otherHr);

        assertThrows(AccessDeniedException.class, () -> service.approveAmendment("am1", null));
    }

    @Test
    void approveAmendment_alreadyResolved_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);
        AssignmentAmendment am = AssignmentAmendment.builder().assignment(a)
                .amendmentType(AmendmentType.RATE_REVISION).newValue("150").status(AmendmentStatus.APPROVED).build();

        when(amendmentRepository.findById("am1")).thenReturn(Optional.of(am));
        actingAs(riya);

        assertThrows(IllegalArgumentException.class, () -> service.approveAmendment("am1", null));
    }

    @Test
    void rejectAmendment_byOwningHr_succeeds() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", riya);
        ContractorProfile p = profile("p1");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(10);
        Assignment a = assignment("a1", riya, sam, r, p, start, end);
        AssignmentAmendment am = AssignmentAmendment.builder().assignment(a)
                .amendmentType(AmendmentType.RATE_REVISION).newValue("150").status(AmendmentStatus.PENDING).build();

        when(amendmentRepository.findById("am1")).thenReturn(Optional.of(am));
        actingAs(riya);
        when(amendmentRepository.save(any(AssignmentAmendment.class))).thenAnswer(i -> i.getArgument(0));

        service.rejectAmendment("am1", "not approved");

        assertEquals(AmendmentStatus.REJECTED, am.getStatus());
        assertEquals(riya.getId(), am.getApprovedBy().getId());
        verify(auditService).logAction(eq(riya.getId()), eq("ASSIGNMENT_AMENDMENT_REJECTED"), anyString(), eq(am.getId()),
                anyString());
    }
}

package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.AssignmentRequestDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.AssignmentNotFoundException;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.exception.SubmissionNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.publisher.NotificationPublisher;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.enums.ExperienceLevel;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.repository.TimesheetRepository;
import org.junit.jupiter.api.AfterEach;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 4 - Assignment service tests (creation rules, availability linkage, status transitions, HR ownership).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssignmentServiceImplTest {

    @Mock private AssignmentRepository assignmentRepository;
    @Mock private VendorSubmissionRepository submissionRepository;
    @Mock private ResourceRequisitionRepository requisitionRepository;
    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private EngagementHistoryRepository engagementHistoryRepository;
    @Mock private TimesheetRepository timesheetRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private NotificationPublisher notificationPublisher;

    @InjectMocks private AssignmentServiceImpl service;

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

    private ResourceRequisition req(String id, RequisitionStatus status, User creator, int qty, EngagementType eng) {
        ResourceRequisition r = ResourceRequisition.builder()
                .title("Java Dev").status(status).creator(creator).quantity(qty).engagementType(eng).orgUnitId("ORG1")
                .build();
        r.setId(id);
        return r;
    }

    private ContractorProfile profile(String id, AvailabilityStatus avail) {
        User cu = user("cu-" + id, "c" + id + "@x.com", UserRole.CONTRACTOR);
        ContractorProfile p = ContractorProfile.builder().user(cu).availabilityStatus(avail)
                .profileStatus(ProfileStatus.ACTIVE).build();
        p.setId(id);
        return p;
    }

    private VendorSubmission submission(String id, SubmissionStatus status, ResourceRequisition r,
                                        ContractorProfile p, User vendor) {
        VendorSubmission s = VendorSubmission.builder()
                .requisition(r).contractorProfile(p).submittedBy(vendor).status(status)
                .proposedRate(new BigDecimal("90")).submissionDate(LocalDate.now()).build();
        s.setId(id);
        return s;
    }

    private AssignmentRequestDTO assignDto(LocalDate start, LocalDate end) {
        return AssignmentRequestDTO.builder()
                .vendorSubmissionId("sub1").startDate(start).endDate(end)
                .agreedRatePerDay(new BigDecimal("100")).engagementType(EngagementType.REMOTE)
                .sowReference("SOW-001").build();
    }

    // ---------- createAssignment ----------

    @Test
    void createAssignment_success_fromSelected_setsONASSIGNMENT_andAudits() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);
        when(assignmentRepository.existsByContractorProfileIdAndRequisitionIdAndStatusIn("p1", "r1",
                java.util.List.of(AssignmentStatus.ACTIVE, AssignmentStatus.EXTENDED, AssignmentStatus.CREATED)))
                .thenReturn(false);
        actingAs(riya);
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(i -> {
            Assignment a = i.getArgument(0);
            a.setId("a1");
            return a;
        });
        when(assignmentRepository.countByRequisitionIdAndStatus("r1", AssignmentStatus.ACTIVE)).thenReturn(1L);
        when(assignmentRepository.countByRequisitionIdAndStatus("r1", AssignmentStatus.EXTENDED)).thenReturn(0L);
        when(assignmentRepository.countByRequisitionIdAndStatus("r1", AssignmentStatus.CREATED)).thenReturn(0L);

        service.createAssignment(assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30)));

        assertEquals(AvailabilityStatus.ON_ASSIGNMENT, p.getAvailabilityStatus());
        verify(contractorProfileRepository).save(p);
        verify(auditService).logAction(anyString(), eq("ASSIGNMENT_CREATED"), anyString(), anyString(), anyString());
    }

    @Test
    void createAssignment_nonOwnerHr_denied() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User otherHr = user("hr2", "other@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);
        actingAs(otherHr);

        assertThrows(AccessDeniedException.class, () -> service.createAssignment(
                assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30))));
    }

    @Test
    void createAssignment_nonSelected_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SHORTLISTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        assertThrows(BusinessValidationException.class, () -> service.createAssignment(
                assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30))));
    }

    @Test
    void createAssignment_submissionNotFound_throws() {
        when(submissionRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(SubmissionNotFoundException.class, () -> service.createAssignment(
                assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30))));
    }

    @Test
    void createAssignment_duplicateActive_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);
        when(assignmentRepository.existsByContractorProfileIdAndRequisitionIdAndStatusIn("p1", "r1",
                java.util.List.of(AssignmentStatus.ACTIVE, AssignmentStatus.EXTENDED, AssignmentStatus.CREATED)))
                .thenReturn(true);
        assertThrows(BusinessValidationException.class, () -> service.createAssignment(
                assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30))));
    }

    @Test
    void createAssignment_engagementTypeMismatch_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.ONSITE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);
        when(assignmentRepository.existsByContractorProfileIdAndRequisitionIdAndStatusIn("p1", "r1",
                java.util.List.of(AssignmentStatus.ACTIVE, AssignmentStatus.EXTENDED, AssignmentStatus.CREATED)))
                .thenReturn(false);
        actingAs(riya);

        AssignmentRequestDTO dto = assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30));
        dto.setEngagementType(EngagementType.REMOTE);
        assertThrows(BusinessValidationException.class, () -> service.createAssignment(dto));
    }

    @Test
    void createAssignment_requisitionClosed_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.CLOSED, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);
        assertThrows(BusinessValidationException.class, () -> service.createAssignment(
                assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30))));
    }

    @Test
    void createAssignment_endBeforeStart_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);

        LocalDate start = LocalDate.now().plusDays(10);
        AssignmentRequestDTO dto = assignDto(start, start.minusDays(1));
        assertThrows(BusinessValidationException.class, () -> service.createAssignment(dto));
    }

    @Test
    void createAssignment_autoFill_whenQuantityReached() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 2, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission sub = submission("sub1", SubmissionStatus.SELECTED, r, p, sam);

        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(sub));
        when(assignmentRepository.existsByVendorSubmissionId("sub1")).thenReturn(false);
        when(assignmentRepository.existsByContractorProfileIdAndRequisitionIdAndStatusIn(anyString(), anyString(),
                any())).thenReturn(false);
        actingAs(riya);
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(i -> {
            Assignment a = i.getArgument(0);
            a.setId("a1");
            return a;
        });
        when(assignmentRepository.countByRequisitionIdAndStatus("r1", AssignmentStatus.ACTIVE)).thenReturn(2L);
        when(assignmentRepository.countByRequisitionIdAndStatus("r1", AssignmentStatus.EXTENDED)).thenReturn(0L);
        when(assignmentRepository.countByRequisitionIdAndStatus("r1", AssignmentStatus.CREATED)).thenReturn(0L);

        service.createAssignment(assignDto(LocalDate.now().plusDays(1), LocalDate.now().plusDays(30)));

        verify(requisitionRepository).save(r);
        assertEquals(RequisitionStatus.FILLED, r.getStatus());
    }

    @Test
    void cancelAssignment_byOwningHr_releasesContractor() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1, EngagementType.REMOTE);
        ContractorProfile p = profile("p1", AvailabilityStatus.ON_ASSIGNMENT);
        Assignment a = Assignment.builder().requisition(r).contractorProfile(p).hiringManager(riya)
                .vendor(sam).status(AssignmentStatus.CREATED).build();
        a.setId("a1");

        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(a));
        actingAs(riya);
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(i -> i.getArgument(0));
        when(assignmentRepository.findByContractorProfileId("p1")).thenReturn(java.util.List.of());

        service.cancelAssignment("a1");

        assertEquals(AssignmentStatus.CANCELLED, a.getStatus());
        assertEquals(AvailabilityStatus.AVAILABLE, p.getAvailabilityStatus());
    }
}

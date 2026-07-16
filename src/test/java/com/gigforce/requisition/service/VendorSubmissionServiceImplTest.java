package com.gigforce.requisition.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.RequisitionNotFoundException;
import com.gigforce.exception.SubmissionNotFoundException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.dto.VendorSubmissionRequestDTO;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.enums.ExperienceLevel;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
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
 * Module 3 - Vendor Submission service tests (submit rules, status transitions, auto-fill, RBAC).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VendorSubmissionServiceImplTest {

    @Mock private VendorSubmissionRepository submissionRepository;
    @Mock private ResourceRequisitionRepository requisitionRepository;
    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private EngagementHistoryRepository engagementHistoryRepository;
    @Mock private AuditService auditService;

    @InjectMocks private VendorSubmissionServiceImpl service;

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

    private ResourceRequisition req(String id, RequisitionStatus status, User creator, int quantity) {
        ResourceRequisition r = ResourceRequisition.builder()
                .title("Java Dev").status(status).creator(creator).quantity(quantity).build();
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
                                        ContractorProfile p, User submittedBy) {
        VendorSubmission s = VendorSubmission.builder()
                .requisition(r).contractorProfile(p).submittedBy(submittedBy).status(status)
                .proposedRate(new BigDecimal("90")).submissionDate(LocalDate.now()).build();
        s.setId(id);
        return s;
    }

    private VendorSubmissionRequestDTO submitDto() {
        return VendorSubmissionRequestDTO.builder().contractorProfileId("p1").proposedRate(new BigDecimal("90")).remarks("ok").build();
    }

    // ---------- submitContractor ----------

    @Test
    void submitContractor_success() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(submissionRepository.existsByRequisitionIdAndContractorProfileId("r1", "p1")).thenReturn(false);
        actingAs(sam);
        when(submissionRepository.save(any(VendorSubmission.class))).thenAnswer(i -> {
            VendorSubmission s = i.getArgument(0);
            s.setId("sub1");
            return s;
        });

        assertEquals(SubmissionStatus.SUBMITTED, service.submitContractor("r1", submitDto()).getStatus());
        verify(auditService).logAction(anyString(), eq("VENDOR_SUBMISSION_CREATED"), anyString(), anyString(), anyString());
    }

    @Test
    void submitContractor_requisitionNotOpen_throws() {
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        assertThrows(BusinessValidationException.class, () -> service.submitContractor("r1", submitDto()));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void submitContractor_requisitionNotFound_throws() {
        when(requisitionRepository.findById("r1")).thenReturn(Optional.empty());
        assertThrows(RequisitionNotFoundException.class, () -> service.submitContractor("r1", submitDto()));
    }

    @Test
    void submitContractor_contractorNotAvailable_throws() {
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        ContractorProfile p = profile("p1", AvailabilityStatus.ON_ASSIGNMENT);
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        assertThrows(BusinessValidationException.class, () -> service.submitContractor("r1", submitDto()));
    }

    @Test
    void submitContractor_duplicate_throws() {
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(submissionRepository.existsByRequisitionIdAndContractorProfileId("r1", "p1")).thenReturn(true);
        assertThrows(BusinessValidationException.class, () -> service.submitContractor("r1", submitDto()));
    }

    @Test
    void submitContractor_negativeRate_throws() {
        VendorSubmissionRequestDTO dto = submitDto();
        dto.setProposedRate(new BigDecimal("-5"));
        assertThrows(BusinessValidationException.class, () -> service.submitContractor("r1", dto));
    }

    @Test
    void submitContractor_byContractor_denied() {
        User arjun = user("c1", "arjun@x.com", UserRole.CONTRACTOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(submissionRepository.existsByRequisitionIdAndContractorProfileId("r1", "p1")).thenReturn(false);
        actingAs(arjun);
        assertThrows(AccessDeniedException.class, () -> service.submitContractor("r1", submitDto()));
    }

    // ---------- transitionStatus ----------

    @Test
    void transition_shortlist_bySubmittingVendor_succeeds() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SUBMITTED, r, profile("p1", AvailabilityStatus.AVAILABLE), sam);
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(sam);
        when(submissionRepository.saveAndFlush(any(VendorSubmission.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(SubmissionStatus.SHORTLISTED, service.transitionStatus("sub1", SubmissionStatus.SHORTLISTED, null).getStatus());
    }

    @Test
    void transition_shortlist_byOtherVendor_denied() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        User otherVendor = user("v2", "other@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SUBMITTED, r, profile("p1", AvailabilityStatus.AVAILABLE), sam);
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(otherVendor);
        assertThrows(AccessDeniedException.class, () -> service.transitionStatus("sub1", SubmissionStatus.SHORTLISTED, null));
    }

    @Test
    void transition_select_byVendor_denied() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SHORTLISTED, r, profile("p1", AvailabilityStatus.AVAILABLE), sam);
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(sam);
        assertThrows(AccessDeniedException.class, () -> service.transitionStatus("sub1", SubmissionStatus.SELECTED, null));
    }

    @Test
    void transition_select_byHr_assignsContractorAndAutoFills() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1);
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission s = submission("sub1", SubmissionStatus.SHORTLISTED, r, p, user("v1", "sam@x.com", UserRole.VENDOR));
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(riya);
        when(submissionRepository.saveAndFlush(any(VendorSubmission.class))).thenAnswer(i -> i.getArgument(0));
        when(submissionRepository.countByRequisitionIdAndStatus("r1", SubmissionStatus.SELECTED)).thenReturn(1L);

        service.transitionStatus("sub1", SubmissionStatus.SELECTED, "great fit");

        assertEquals(SubmissionStatus.SELECTED, s.getStatus());
        assertEquals(AvailabilityStatus.ON_ASSIGNMENT, p.getAvailabilityStatus(), "selected contractor goes on assignment");
        assertEquals(RequisitionStatus.FILLED, r.getStatus(), "requisition auto-fills when selected count reaches quantity");
        verify(contractorProfileRepository).save(p);
        verify(requisitionRepository).save(r);
    }

    @Test
    void transition_select_partialFill_staysOpen() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 3); // needs 3
        ContractorProfile p = profile("p1", AvailabilityStatus.AVAILABLE);
        VendorSubmission s = submission("sub1", SubmissionStatus.SHORTLISTED, r, p, user("v1", "sam@x.com", UserRole.VENDOR));
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(riya);
        when(submissionRepository.saveAndFlush(any(VendorSubmission.class))).thenAnswer(i -> i.getArgument(0));
        when(submissionRepository.countByRequisitionIdAndStatus("r1", SubmissionStatus.SELECTED)).thenReturn(1L);

        service.transitionStatus("sub1", SubmissionStatus.SELECTED, null);

        assertEquals(RequisitionStatus.OPEN, r.getStatus(), "requisition stays OPEN until quantity is met");
        verify(requisitionRepository, never()).save(r);
    }

    @Test
    void transition_invalidStateChange_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, 1);
        // SUBMITTED -> SELECTED is not a legal submission transition
        VendorSubmission s = submission("sub1", SubmissionStatus.SUBMITTED, r, profile("p1", AvailabilityStatus.AVAILABLE),
                user("v1", "sam@x.com", UserRole.VENDOR));
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        assertThrows(IllegalArgumentException.class, () -> service.transitionStatus("sub1", SubmissionStatus.SELECTED, null));
    }

    @Test
    void transition_requisitionNotActive_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        ResourceRequisition r = req("r1", RequisitionStatus.CANCELLED, riya, 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SHORTLISTED, r, profile("p1", AvailabilityStatus.AVAILABLE),
                user("v1", "sam@x.com", UserRole.VENDOR));
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        assertThrows(BusinessValidationException.class, () -> service.transitionStatus("sub1", SubmissionStatus.SELECTED, null));
    }

    @Test
    void transition_submissionNotFound_throws() {
        when(submissionRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(SubmissionNotFoundException.class, () -> service.transitionStatus("x", SubmissionStatus.SHORTLISTED, null));
    }

    @Test
    void transition_byUnrelatedHiringManager_denied() {
        User creator = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER);
        User otherHr = user("hr2", "other@acme.com", UserRole.HIRING_MANAGER);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, creator, 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SUBMITTED, r, profile("p1", AvailabilityStatus.AVAILABLE),
                user("v1", "sam@x.com", UserRole.VENDOR));
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(otherHr);
        assertThrows(AccessDeniedException.class, () -> service.transitionStatus("sub1", SubmissionStatus.REJECTED, null));
    }

    // ---------- getSubmissionById ----------

    @Test
    void getSubmissionById_submitterAllowed() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SUBMITTED, r, profile("p1", AvailabilityStatus.AVAILABLE), sam);
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(sam);
        assertEquals("sub1", service.getSubmissionById("sub1").getId());
    }

    @Test
    void getSubmissionById_unrelatedUserDenied() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR);
        User stranger = user("v9", "stranger@x.com", UserRole.VENDOR);
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER), 1);
        VendorSubmission s = submission("sub1", SubmissionStatus.SUBMITTED, r, profile("p1", AvailabilityStatus.AVAILABLE), sam);
        when(submissionRepository.findById("sub1")).thenReturn(Optional.of(s));
        actingAs(stranger);
        assertThrows(AccessDeniedException.class, () -> service.getSubmissionById("sub1"));
    }
}

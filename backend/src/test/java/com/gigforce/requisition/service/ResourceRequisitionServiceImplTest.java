package com.gigforce.requisition.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.exception.RequisitionNotFoundException;
import com.gigforce.exception.SkillNotFoundException;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.publisher.NotificationPublisher;
import com.gigforce.requisition.dto.ResourceRequisitionRequestDTO;
import com.gigforce.requisition.dto.ResourceRequisitionResponseDTO;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.enums.ExperienceLevel;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import com.gigforce.security.CurrentUserContext;
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
 * Module 3 - Resource Requisition service tests (creation rules, status transitions, view access).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ResourceRequisitionServiceImplTest {

    @Mock private ResourceRequisitionRepository requisitionRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private CurrentUserContext currentUserContext;
    @Mock private NotificationPublisher notificationPublisher;
    @Mock private VendorSubmissionRepository submissionRepository;

    @InjectMocks private ResourceRequisitionServiceImpl service;

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private User user(String id, String email, UserRole role, String org) {
        User u = User.builder().name("N").email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).orgUnitId(org).build();
        u.setId(id);
        return u;
    }

    private void actingAs(User u) {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(u.getEmail(), null));
        SecurityContextHolder.setContext(ctx);
        when(userRepository.findByEmail(u.getEmail())).thenReturn(Optional.of(u));
    }

    private Skill skill(String id, String name) {
        Skill s = Skill.builder().name(name).category("Tech").build();
        s.setId(id);
        return s;
    }

    private ResourceRequisition req(String id, RequisitionStatus status, User creator, String org) {
        ResourceRequisition r = ResourceRequisition.builder()
                .title("Java Dev").requiredSkill(skill("s1", "Java")).minExperienceYears(2)
                .maxHourlyRate(new BigDecimal("100")).quantity(1).status(status).creator(creator).orgUnitId(org)
                .engagementType(EngagementType.REMOTE).experienceLevel(ExperienceLevel.MID)
                .startDate(LocalDate.now().plusDays(10)).duration("6 months").build();
        r.setId(id);
        return r;
    }

    private ResourceRequisitionRequestDTO createDto() {
        return ResourceRequisitionRequestDTO.builder()
                .title("Java Dev").description("desc").requiredSkillId("s1").minExperienceYears(2)
                .maxHourlyRate(new BigDecimal("100")).quantity(1).engagementType(EngagementType.REMOTE)
                .experienceLevel(ExperienceLevel.MID).startDate(LocalDate.now().plusDays(10)).duration("6 months")
                .businessUnitId("IT").build();
    }

    // ---------- create ----------

    @Test
    void createRequisition_byHr_succeeds_asDraft() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        actingAs(riya);
        when(currentUserContext.getCurrentUserRole()).thenReturn("HIRING_MANAGER");
        when(currentUserContext.getCurrentUserOrgUnitId()).thenReturn("ACME");
        when(skillRepository.findById("s1")).thenReturn(Optional.of(skill("s1", "Java")));
        ResourceRequisition saved = req("r1", RequisitionStatus.DRAFT, riya, "ACME");
        when(requisitionRepository.save(any(ResourceRequisition.class))).thenReturn(saved);

        ResourceRequisitionResponseDTO result = service.createRequisition(createDto());

        assertEquals(RequisitionStatus.DRAFT, result.getStatus());
        ArgumentCaptor<ResourceRequisition> captor = ArgumentCaptor.forClass(ResourceRequisition.class);
        verify(requisitionRepository).save(captor.capture());
        assertEquals(RequisitionStatus.DRAFT, captor.getValue().getStatus(), "new requisition must be DRAFT");
        assertEquals("ACME", captor.getValue().getOrgUnitId(), "orgUnitId must come from creator");
        verify(auditService).logAction(anyString(), eq("REQUISITION_CREATED"), anyString(), anyString(), anyString());
    }

    @Test
    void createRequisition_nonHrRole_throws() {
        User sam = user("v1", "sam@x.com", UserRole.VENDOR, null);
        actingAs(sam);
        when(currentUserContext.getCurrentUserRole()).thenReturn("VENDOR");
        assertThrows(BusinessValidationException.class, () -> service.createRequisition(createDto()));
        verify(requisitionRepository, never()).save(any());
    }

    @Test
    void createRequisition_creatorWithoutOrg_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, null);
        actingAs(riya);
        when(currentUserContext.getCurrentUserRole()).thenReturn("HIRING_MANAGER");
        when(currentUserContext.getCurrentUserOrgUnitId()).thenReturn(null);
        assertThrows(BusinessValidationException.class, () -> service.createRequisition(createDto()));
    }

    @Test
    void createRequisition_skillNotFound_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        actingAs(riya);
        when(currentUserContext.getCurrentUserRole()).thenReturn("HIRING_MANAGER");
        when(currentUserContext.getCurrentUserOrgUnitId()).thenReturn("ACME");
        when(skillRepository.findById("s1")).thenReturn(Optional.empty());
        assertThrows(SkillNotFoundException.class, () -> service.createRequisition(createDto()));
    }

    @Test
    void createRequisition_invalidBusinessUnit_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        actingAs(riya);
        when(currentUserContext.getCurrentUserRole()).thenReturn("HIRING_MANAGER");
        when(currentUserContext.getCurrentUserOrgUnitId()).thenReturn("ACME");
        when(skillRepository.findById("s1")).thenReturn(Optional.of(skill("s1", "Java")));
        ResourceRequisitionRequestDTO dto = createDto();
        dto.setBusinessUnitId("MARKETING");
        assertThrows(BusinessValidationException.class, () -> service.createRequisition(dto));
    }

    @Test
    void createRequisition_pastStartDate_throws() {
        ResourceRequisitionRequestDTO dto = createDto();
        dto.setStartDate(LocalDate.now().minusDays(1));
        assertThrows(BusinessValidationException.class, () -> service.createRequisition(dto));
    }

    @Test
    void createRequisition_quantityZero_throws() {
        ResourceRequisitionRequestDTO dto = createDto();
        dto.setQuantity(0);
        assertThrows(BusinessValidationException.class, () -> service.createRequisition(dto));
    }

    // ---------- update ----------

    @Test
    void updateRequisition_draftByCreator_succeeds() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, riya, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        actingAs(riya);
        when(skillRepository.findById("s1")).thenReturn(Optional.of(skill("s1", "Java")));
        when(requisitionRepository.save(any(ResourceRequisition.class))).thenAnswer(i -> i.getArgument(0));

        service.updateRequisition("r1", createDto());

        verify(auditService).logAction(anyString(), eq("REQUISITION_UPDATED"), anyString(), eq("r1"), anyString());
    }

    @Test
    void updateRequisition_notDraft_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        assertThrows(BusinessValidationException.class, () -> service.updateRequisition("r1", createDto()));
    }

    @Test
    void updateRequisition_notFound_throws() {
        when(requisitionRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(RequisitionNotFoundException.class, () -> service.updateRequisition("x", createDto()));
    }

    @Test
    void updateRequisition_notCreatorNotAdmin_throws() {
        User creator = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        User other = user("hr2", "other@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, creator, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        actingAs(other);
        assertThrows(AccessDeniedException.class, () -> service.updateRequisition("r1", createDto()));
    }

    @Test
    void updateRequisition_invalidBusinessUnit_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, riya, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        actingAs(riya);
        when(skillRepository.findById("s1")).thenReturn(Optional.of(skill("s1", "Java")));
        ResourceRequisitionRequestDTO dto = createDto();
        dto.setBusinessUnitId("NOPE");
        assertThrows(BusinessValidationException.class, () -> service.updateRequisition("r1", dto));
    }

    // ---------- publish / cancel ----------

    @Test
    void publishRequisition_draftToOpen_succeeds() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, riya, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        actingAs(riya);
        when(requisitionRepository.save(any(ResourceRequisition.class))).thenAnswer(i -> i.getArgument(0));

        ResourceRequisitionResponseDTO result = service.publishRequisition("r1");

        assertEquals(RequisitionStatus.OPEN, result.getStatus());
        verify(notificationPublisher).publishRequisitionPublished(any(ResourceRequisition.class));
    }

    @Test
    void publishRequisition_invalidTransition_throws() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.FILLED, riya, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        assertThrows(BusinessValidationException.class, () -> service.publishRequisition("r1"));
    }

    @Test
    void publishRequisition_notCreator_throws() {
        User creator = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        User other = user("hr2", "other@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, creator, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        actingAs(other);
        assertThrows(AccessDeniedException.class, () -> service.publishRequisition("r1"));
    }

    @Test
    void cancelRequisition_openToCancelled_succeeds() {
        User riya = user("hr1", "riya@acme.com", UserRole.HIRING_MANAGER, "ACME");
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, riya, "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        actingAs(riya);
        when(requisitionRepository.save(any(ResourceRequisition.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals(RequisitionStatus.CANCELLED, service.cancelRequisition("r1").getStatus());
    }

    // ---------- getRequisitionById view access ----------

    private void asRole(String role, String org) {
        when(currentUserContext.getCurrentUserRole()).thenReturn(role);
        when(currentUserContext.getCurrentUserOrgUnitId()).thenReturn(org);
    }

    @Test
    void getById_vendor_openAllowed() {
        ResourceRequisition r = req("r1", RequisitionStatus.OPEN, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "ACME"), "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        asRole("VENDOR", null);
        assertEquals("r1", service.getRequisitionById("r1").getId());
    }

    @Test
    void getById_vendor_draftDenied() {
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "ACME"), "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        asRole("VENDOR", null);
        when(submissionRepository.existsByRequisitionIdAndSubmittedBy_OrgUnitId(eq("r1"), any())).thenReturn(false);
        assertThrows(AccessDeniedException.class, () -> service.getRequisitionById("r1"));
    }

    @Test
    void getById_hr_ownOrgAllowed() {
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "ACME"), "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        asRole("HIRING_MANAGER", "ACME");
        assertEquals("r1", service.getRequisitionById("r1").getId());
    }

    @Test
    void getById_hr_otherOrgDenied() {
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "BETA"), "BETA");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        asRole("HIRING_MANAGER", "ACME");
        assertThrows(AccessDeniedException.class, () -> service.getRequisitionById("r1"));
    }

    @Test
    void getById_contractor_openAllowed_nonOpenDenied() {
        ResourceRequisition open = req("r1", RequisitionStatus.OPEN, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "ACME"), "ACME");
        ResourceRequisition draft = req("r2", RequisitionStatus.DRAFT, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "ACME"), "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(open));
        when(requisitionRepository.findById("r2")).thenReturn(Optional.of(draft));
        asRole("CONTRACTOR", null);
        assertEquals("r1", service.getRequisitionById("r1").getId());
        assertThrows(AccessDeniedException.class, () -> service.getRequisitionById("r2"));
    }

    @Test
    void getById_admin_allowedForAnyStatus() {
        ResourceRequisition r = req("r1", RequisitionStatus.DRAFT, user("hr1", "h@x.com", UserRole.HIRING_MANAGER, "ACME"), "ACME");
        when(requisitionRepository.findById("r1")).thenReturn(Optional.of(r));
        asRole("ADMIN", null);
        assertEquals("r1", service.getRequisitionById("r1").getId());
    }

    @Test
    void getById_notFound_throws() {
        when(requisitionRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(RequisitionNotFoundException.class, () -> service.getRequisitionById("x"));
    }
}

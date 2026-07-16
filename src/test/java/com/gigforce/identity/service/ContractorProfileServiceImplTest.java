package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.*;
import com.gigforce.identity.dto.*;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.ContractorSkill;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.ContractorSkillRepository;
import com.gigforce.identity.repository.SkillRepository;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 2 - Contractor Profile & Skill Management: profile + skill-mapping service tests.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ContractorProfileServiceImplTest {

    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private SkillRepository skillRepository;
    @Mock private ContractorSkillRepository contractorSkillRepository;
    @Mock private AuditService auditService;
    @Mock private ContractorCertificationRepository contractorCertificationRepository;
    @Mock private NotificationPublisher notificationPublisher;

    @InjectMocks private ContractorProfileServiceImpl service;

    private static final String ACTOR_EMAIL = "actor@gigforce.com";

    @BeforeEach
    void setActor() {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(ACTOR_EMAIL, null));
        SecurityContextHolder.setContext(ctx);
        User actor = contractorUser("actor-id", ACTOR_EMAIL);
        when(userRepository.findByEmail(ACTOR_EMAIL)).thenReturn(Optional.of(actor));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private User contractorUser(String id, String email) {
        User u = User.builder().name("Contractor").email(email).password("h").phone("1234567890")
                .role(UserRole.CONTRACTOR).status(UserStatus.ACTIVE).orgUnitId("ORG1").build();
        u.setId(id);
        return u;
    }

    private ContractorProfile profile(String id, User user, ProfileStatus status, AvailabilityStatus avail) {
        ContractorProfile p = ContractorProfile.builder()
                .user(user).displayName("Disp").hourlyRate(new BigDecimal("50")).experienceYears(5)
                .availabilityStatus(avail).profileStatus(status).preferredEngagementType(EngagementType.REMOTE)
                .address("addr").build();
        p.setId(id);
        return p;
    }

    private ContractorProfileCreationRequestDTO createReq() {
        return ContractorProfileCreationRequestDTO.builder()
                .userId("u1").displayName("John Doe").hourlyRate(new BigDecimal("50"))
                .experienceYears(5).preferredEngagementType("REMOTE").address("addr").build();
    }

    // ---------- createProfile ----------

    @Test
    void createProfile_success_defaultsActiveAndAvailable_withDisplayName() {
        User user = contractorUser("u1", "c@gigforce.com");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(contractorProfileRepository.existsByUser(user)).thenReturn(false);
        ContractorProfile saved = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        saved.setDisplayName("John Doe");
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenReturn(saved);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(saved));

        ContractorProfileResponseDTO result = service.createProfile("u1", createReq());

        assertEquals("John Doe", result.getDisplayName());
        assertEquals("AVAILABLE", result.getAvailabilityStatus());
        ArgumentCaptor<ContractorProfile> captor = ArgumentCaptor.forClass(ContractorProfile.class);
        verify(contractorProfileRepository).save(captor.capture());
        assertEquals(ProfileStatus.ACTIVE, captor.getValue().getProfileStatus(), "new profile must be ACTIVE");
        assertEquals(AvailabilityStatus.AVAILABLE, captor.getValue().getAvailabilityStatus(), "new profile must be AVAILABLE");
        assertEquals("John Doe", captor.getValue().getDisplayName());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_PROFILE_CREATED"), anyString(), anyString(), anyString());
    }

    @Test
    void createProfile_userNotFound_throws() {
        when(userRepository.findById("u1")).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class, () -> service.createProfile("u1", createReq()));
        verify(contractorProfileRepository, never()).save(any());
    }

    @Test
    void createProfile_duplicateProfile_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(contractorProfileRepository.existsByUser(user)).thenReturn(true);
        assertThrows(DuplicateProfileException.class, () -> service.createProfile("u1", createReq()));
    }

    @Test
    void createProfile_nonContractorRole_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        user.setRole(UserRole.VENDOR);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(contractorProfileRepository.existsByUser(user)).thenReturn(false);
        assertThrows(BusinessValidationException.class, () -> service.createProfile("u1", createReq()));
    }

    @Test
    void createProfile_invalidEngagementType_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(contractorProfileRepository.existsByUser(user)).thenReturn(false);
        ContractorProfileCreationRequestDTO req = createReq();
        req.setPreferredEngagementType("TELEPORT");
        assertThrows(BusinessValidationException.class, () -> service.createProfile("u1", req));
    }

    // ---------- getProfileById / getProfileByUserId ----------

    @Test
    void getProfileById_found() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(contractorSkillRepository.findByContractorProfile(p)).thenReturn(List.of());
        assertEquals("p1", service.getProfileById("p1").getId());
    }

    @Test
    void getProfileById_notFound_throws() {
        when(contractorProfileRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(ContractorProfileNotFoundException.class, () -> service.getProfileById("x"));
    }

    @Test
    void getProfileByUserId_profileMissing_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(contractorProfileRepository.findByUser(user)).thenReturn(Optional.empty());
        assertThrows(ContractorProfileNotFoundException.class, () -> service.getProfileByUserId("u1"));
    }

    // ---------- updateProfileStatus ----------

    @Test
    void updateProfileStatus_activeToBlacklisted_auditsSuspended() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(contractorSkillRepository.findByContractorProfile(any())).thenReturn(List.of());

        service.updateProfileStatus("p1", "BLACKLISTED");

        assertEquals(ProfileStatus.BLACKLISTED, p.getProfileStatus());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_PROFILE_SUSPENDED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void updateProfileStatus_blacklistedToActive_auditsActivated() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.BLACKLISTED, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(contractorProfileRepository.save(any(ContractorProfile.class))).thenAnswer(i -> i.getArgument(0));
        when(contractorSkillRepository.findByContractorProfile(any())).thenReturn(List.of());

        service.updateProfileStatus("p1", "ACTIVE");

        assertEquals(ProfileStatus.ACTIVE, p.getProfileStatus());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_PROFILE_ACTIVATED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void updateProfileStatus_invalidTransition_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.INACTIVE, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        // INACTIVE -> BLACKLISTED is not an allowed transition
        assertThrows(BusinessValidationException.class, () -> service.updateProfileStatus("p1", "BLACKLISTED"));
        verify(contractorProfileRepository, never()).save(any());
    }

    @Test
    void updateProfileStatus_invalidValue_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        assertThrows(BusinessValidationException.class, () -> service.updateProfileStatus("p1", "GHOSTED"));
    }

    @Test
    void updateProfileStatus_profileNotFound_throws() {
        when(contractorProfileRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(ContractorProfileNotFoundException.class, () -> service.updateProfileStatus("x", "ACTIVE"));
    }

    // ---------- skills ----------

    private Skill skill(String id, String name) {
        Skill s = Skill.builder().name(name).category("Tech").build();
        s.setId(id);
        return s;
    }

    private ContractorSkillRequestDTO skillReq(String skillId, String prof, Integer years) {
        return ContractorSkillRequestDTO.builder().skillId(skillId).proficiencyLevel(prof).yearsOfExperience(years).build();
    }

    @Test
    void addSkill_success() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        Skill s = skill("s1", "Java");
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.existsByContractorProfileAndSkill(p, s)).thenReturn(false);
        when(contractorSkillRepository.findByContractorProfile(p)).thenReturn(List.of());

        service.addSkill("p1", skillReq("s1", "EXPERT", 3));

        verify(contractorSkillRepository).save(any(ContractorSkill.class));
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_SKILL_ADDED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void addSkill_skillNotFound_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.empty());
        assertThrows(SkillNotFoundException.class, () -> service.addSkill("p1", skillReq("s1", "EXPERT", 3)));
    }

    @Test
    void addSkill_duplicate_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        Skill s = skill("s1", "Java");
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.existsByContractorProfileAndSkill(p, s)).thenReturn(true);
        assertThrows(DuplicateSkillException.class, () -> service.addSkill("p1", skillReq("s1", "EXPERT", 3)));
    }

    @Test
    void addSkill_yearsExceedProfileExperience_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE); // experienceYears = 5
        Skill s = skill("s1", "Java");
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.existsByContractorProfileAndSkill(p, s)).thenReturn(false);
        assertThrows(BusinessValidationException.class, () -> service.addSkill("p1", skillReq("s1", "EXPERT", 10)));
    }

    @Test
    void addSkill_invalidProficiency_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        Skill s = skill("s1", "Java");
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.existsByContractorProfileAndSkill(p, s)).thenReturn(false);
        assertThrows(BusinessValidationException.class, () -> service.addSkill("p1", skillReq("s1", "WIZARD", 3)));
    }

    @Test
    void updateSkill_associationNotFound_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        Skill s = skill("s1", "Java");
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.findByContractorProfileAndSkill(p, s)).thenReturn(Optional.empty());
        ContractorSkillUpdateRequestDTO req = ContractorSkillUpdateRequestDTO.builder()
                .proficiencyLevel("EXPERT").yearsOfExperience(2).build();
        assertThrows(SkillNotFoundException.class, () -> service.updateSkill("p1", "s1", req));
    }

    @Test
    void updateSkill_success() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        Skill s = skill("s1", "Java");
        ContractorSkill cs = ContractorSkill.builder().contractorProfile(p).skill(s)
                .proficiencyLevel(com.gigforce.identity.enums.ProficiencyLevel.BEGINNER).yearsOfExperience(1).build();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.findByContractorProfileAndSkill(p, s)).thenReturn(Optional.of(cs));
        when(contractorSkillRepository.findByContractorProfile(p)).thenReturn(List.of());
        ContractorSkillUpdateRequestDTO req = ContractorSkillUpdateRequestDTO.builder()
                .proficiencyLevel("EXPERT").yearsOfExperience(2).build();

        service.updateSkill("p1", "s1", req);

        assertEquals(com.gigforce.identity.enums.ProficiencyLevel.EXPERT, cs.getProficiencyLevel());
        assertEquals(2, cs.getYearsOfExperience());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_SKILL_UPDATED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void removeSkill_associationNotFound_throws() {
        User user = contractorUser("u1", "c@gigforce.com");
        ContractorProfile p = profile("p1", user, ProfileStatus.ACTIVE, AvailabilityStatus.AVAILABLE);
        Skill s = skill("s1", "Java");
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(skillRepository.findById("s1")).thenReturn(Optional.of(s));
        when(contractorSkillRepository.findByContractorProfileAndSkill(p, s)).thenReturn(Optional.empty());
        assertThrows(SkillNotFoundException.class, () -> service.removeSkill("p1", "s1"));
    }
}

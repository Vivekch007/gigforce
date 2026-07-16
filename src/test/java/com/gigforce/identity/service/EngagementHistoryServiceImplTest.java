package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.EngagementNotFoundException;
import com.gigforce.identity.dto.EngagementFeedbackRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryRequestDTO;
import com.gigforce.identity.dto.EngagementHistoryUpdateRequestDTO;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 2 - Engagement History service tests.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EngagementHistoryServiceImplTest {

    @Mock private EngagementHistoryRepository engagementHistoryRepository;
    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;

    @InjectMocks private EngagementHistoryServiceImpl service;

    @BeforeEach
    void setActor() {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken("actor@gigforce.com", null));
        SecurityContextHolder.setContext(ctx);
        User actor = new User();
        actor.setId("actor-id");
        when(userRepository.findByEmail("actor@gigforce.com")).thenReturn(Optional.of(actor));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private ContractorProfile profile() {
        User u = User.builder().name("C").email("c@gigforce.com").password("h").phone("1234567890")
                .role(UserRole.CONTRACTOR).status(UserStatus.ACTIVE).build();
        u.setId("u1");
        ContractorProfile p = ContractorProfile.builder().user(u).build();
        p.setId("p1");
        return p;
    }

    private EngagementHistory engagement(ContractorProfile p, LocalDate start, LocalDate end) {
        EngagementHistory e = EngagementHistory.builder()
                .contractorProfile(p).clientName("Acme").roleTitle("Dev").startDate(start).endDate(end).build();
        e.setId("eng1");
        return e;
    }

    // ---------- add ----------

    @Test
    void addEngagement_success() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.save(any(EngagementHistory.class))).thenAnswer(i -> i.getArgument(0));
        EngagementHistoryRequestDTO req = EngagementHistoryRequestDTO.builder()
                .clientName("Acme").roleTitle("Dev")
                .startDate(LocalDate.now().minusMonths(6)).endDate(LocalDate.now().minusMonths(1)).build();

        service.addEngagement("p1", req);

        verify(engagementHistoryRepository).save(any(EngagementHistory.class));
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_ENGAGEMENT_CREATED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void addEngagement_endBeforeStart_throws() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        EngagementHistoryRequestDTO req = EngagementHistoryRequestDTO.builder()
                .clientName("Acme").roleTitle("Dev")
                .startDate(LocalDate.now()).endDate(LocalDate.now().minusDays(1)).build();
        assertThrows(IllegalArgumentException.class, () -> service.addEngagement("p1", req));
        verify(engagementHistoryRepository, never()).save(any());
    }

    @Test
    void addEngagement_profileNotFound_throws() {
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.empty());
        EngagementHistoryRequestDTO req = EngagementHistoryRequestDTO.builder()
                .clientName("Acme").roleTitle("Dev").startDate(LocalDate.now().minusMonths(1)).build();
        assertThrows(ContractorProfileNotFoundException.class, () -> service.addEngagement("p1", req));
    }

    // ---------- update ----------

    @Test
    void updateEngagement_success() {
        ContractorProfile p = profile();
        EngagementHistory e = engagement(p, LocalDate.now().minusMonths(6), LocalDate.now().minusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.findById("eng1")).thenReturn(Optional.of(e));
        when(engagementHistoryRepository.save(any(EngagementHistory.class))).thenAnswer(i -> i.getArgument(0));
        EngagementHistoryUpdateRequestDTO req = EngagementHistoryUpdateRequestDTO.builder()
                .roleTitle("Senior Dev").startDate(LocalDate.now().minusMonths(6)).endDate(LocalDate.now().minusMonths(1)).build();

        service.updateEngagement("p1", "eng1", req);

        assertEquals("Senior Dev", e.getRoleTitle());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_ENGAGEMENT_UPDATED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void updateEngagement_notOnProfile_throws() {
        ContractorProfile p = profile();
        ContractorProfile other = ContractorProfile.builder().user(p.getUser()).build();
        other.setId("other");
        EngagementHistory e = engagement(other, LocalDate.now().minusMonths(6), LocalDate.now().minusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.findById("eng1")).thenReturn(Optional.of(e));
        EngagementHistoryUpdateRequestDTO req = EngagementHistoryUpdateRequestDTO.builder()
                .roleTitle("X").startDate(LocalDate.now().minusMonths(6)).endDate(LocalDate.now().minusMonths(1)).build();
        assertThrows(IllegalArgumentException.class, () -> service.updateEngagement("p1", "eng1", req));
    }

    @Test
    void updateEngagement_notFound_throws() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.findById("eng1")).thenReturn(Optional.empty());
        EngagementHistoryUpdateRequestDTO req = EngagementHistoryUpdateRequestDTO.builder()
                .roleTitle("X").startDate(LocalDate.now().minusMonths(6)).build();
        assertThrows(EngagementNotFoundException.class, () -> service.updateEngagement("p1", "eng1", req));
    }

    // ---------- submitFeedback ----------

    @Test
    void submitFeedback_completedEngagement_success() {
        ContractorProfile p = profile();
        EngagementHistory e = engagement(p, LocalDate.now().minusMonths(6), LocalDate.now().minusDays(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.findById("eng1")).thenReturn(Optional.of(e));
        when(engagementHistoryRepository.save(any(EngagementHistory.class))).thenAnswer(i -> i.getArgument(0));
        EngagementFeedbackRequestDTO req = EngagementFeedbackRequestDTO.builder().feedback("Great work").rating(5).build();

        service.submitFeedback("p1", "eng1", req);

        assertEquals(5, e.getRating());
        assertEquals("Great work", e.getFeedback());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_ENGAGEMENT_FEEDBACK_SUBMITTED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void submitFeedback_notCompleted_throws() {
        ContractorProfile p = profile();
        EngagementHistory e = engagement(p, LocalDate.now().minusMonths(1), LocalDate.now().plusMonths(1)); // ends in future
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.findById("eng1")).thenReturn(Optional.of(e));
        EngagementFeedbackRequestDTO req = EngagementFeedbackRequestDTO.builder().feedback("x").rating(4).build();
        assertThrows(IllegalStateException.class, () -> service.submitFeedback("p1", "eng1", req));
        verify(engagementHistoryRepository, never()).save(any());
    }

    // ---------- delete ----------

    @Test
    void deleteEngagement_success() {
        ContractorProfile p = profile();
        EngagementHistory e = engagement(p, LocalDate.now().minusMonths(6), LocalDate.now().minusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(engagementHistoryRepository.findById("eng1")).thenReturn(Optional.of(e));

        service.deleteEngagement("p1", "eng1");

        verify(engagementHistoryRepository).delete(e);
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_ENGAGEMENT_DELETED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void getEngagementsByProfileId_profileNotFound_throws() {
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.empty());
        assertThrows(ContractorProfileNotFoundException.class, () -> service.getEngagementsByProfileId("p1"));
    }
}

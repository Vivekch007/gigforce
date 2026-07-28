package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.exception.CertificationNotFoundException;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.identity.dto.ContractorCertificationRequestDTO;
import com.gigforce.identity.dto.ContractorCertificationResponseDTO;
import com.gigforce.identity.dto.ContractorCertificationUpdateRequestDTO;
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 2 - Contractor Certification service tests, incl. expiry derivation and partial-update.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ContractorCertificationServiceImplTest {

    @Mock private ContractorCertificationRepository certificationRepository;
    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;
    @Mock private ContractorProfileService contractorProfileService;

    @InjectMocks private ContractorCertificationServiceImpl service;

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
        ContractorProfile p = ContractorProfile.builder().user(u).experienceYears(5).build();
        p.setId("p1");
        return p;
    }

    private ContractorCertification cert(ContractorProfile p, CertificationStatus status, LocalDate issue, LocalDate expiry) {
        ContractorCertification c = ContractorCertification.builder()
                .contractorProfile(p).name("AWS").issuingAuthority("Amazon").certificateNumber("123")
                .issueDate(issue).expiryDate(expiry).certStatus(status).build();
        c.setId("cert1");
        return c;
    }

    // ---------- add ----------

    @Test
    void addCertification_futureExpiry_isValid() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findByContractorProfile(p)).thenReturn(List.of());
        when(certificationRepository.save(any(ContractorCertification.class))).thenAnswer(i -> {
            ContractorCertification c = i.getArgument(0);
            c.setId("cert1");
            return c;
        });
        ContractorCertificationRequestDTO req = ContractorCertificationRequestDTO.builder()
                .name("AWS").issuingAuthority("Amazon").certificateNumber("123")
                .issueDate(LocalDate.now().minusYears(1)).expiryDate(LocalDate.now().plusYears(1)).build();

        ContractorCertificationResponseDTO result = service.addCertification("p1", req);

        assertEquals("valid", result.getCertStatus());
        ArgumentCaptor<ContractorCertification> captor = ArgumentCaptor.forClass(ContractorCertification.class);
        verify(certificationRepository).save(captor.capture());
        assertEquals(CertificationStatus.VALID, captor.getValue().getCertStatus());
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_CERTIFICATION_ADDED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void addCertification_pastExpiry_isExpired() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findByContractorProfile(p)).thenReturn(List.of());
        when(certificationRepository.save(any(ContractorCertification.class))).thenAnswer(i -> i.getArgument(0));
        ContractorCertificationRequestDTO req = ContractorCertificationRequestDTO.builder()
                .name("AWS").issuingAuthority("Amazon")
                .issueDate(LocalDate.now().minusYears(2)).expiryDate(LocalDate.now().minusDays(1)).build();

        service.addCertification("p1", req);

        ArgumentCaptor<ContractorCertification> captor = ArgumentCaptor.forClass(ContractorCertification.class);
        verify(certificationRepository).save(captor.capture());
        assertEquals(CertificationStatus.EXPIRED, captor.getValue().getCertStatus());
    }

    @Test
    void addCertification_expiryBeforeIssue_throws() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        ContractorCertificationRequestDTO req = ContractorCertificationRequestDTO.builder()
                .name("AWS").issuingAuthority("Amazon")
                .issueDate(LocalDate.now()).expiryDate(LocalDate.now().minusDays(1)).build();
        assertThrows(BusinessValidationException.class, () -> service.addCertification("p1", req));
        verify(certificationRepository, never()).save(any());
    }

    @Test
    void addCertification_duplicateName_throws() {
        ContractorProfile p = profile();
        ContractorCertification existing = cert(p, CertificationStatus.VALID, LocalDate.now().minusYears(1), LocalDate.now().plusYears(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findByContractorProfile(p)).thenReturn(List.of(existing));
        ContractorCertificationRequestDTO req = ContractorCertificationRequestDTO.builder()
                .name("aws").issuingAuthority("Amazon") // case-insensitive duplicate
                .issueDate(LocalDate.now().minusYears(1)).expiryDate(LocalDate.now().plusYears(1)).build();
        assertThrows(BusinessValidationException.class, () -> service.addCertification("p1", req));
    }

    @Test
    void addCertification_profileNotFound_throws() {
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.empty());
        ContractorCertificationRequestDTO req = ContractorCertificationRequestDTO.builder()
                .name("AWS").issuingAuthority("Amazon").issueDate(LocalDate.now().minusYears(1)).build();
        assertThrows(ContractorProfileNotFoundException.class, () -> service.addCertification("p1", req));
    }

    // ---------- update (partial-update fix) ----------

    @Test
    void updateCertification_onlyStatusProvided_preservesExpiry() {
        ContractorProfile p = profile();
        LocalDate expiry = LocalDate.now().plusYears(1);
        ContractorCertification existing = cert(p, CertificationStatus.VALID, LocalDate.now().minusYears(1), expiry);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.of(existing));
        when(certificationRepository.save(any(ContractorCertification.class))).thenAnswer(i -> i.getArgument(0));
        ContractorCertificationUpdateRequestDTO req = ContractorCertificationUpdateRequestDTO.builder()
                .expiryDate(null).certStatus("revoked").build();

        service.updateCertification("p1", "cert1", req);

        assertEquals(expiry, existing.getExpiryDate(), "expiry must be preserved when not supplied");
        assertEquals(CertificationStatus.REVOKED, existing.getCertStatus());
    }

    @Test
    void updateCertification_onlyExpiryProvided_preservesStatus() {
        ContractorProfile p = profile();
        ContractorCertification existing = cert(p, CertificationStatus.VALID, LocalDate.now().minusYears(1), LocalDate.now().plusMonths(1));
        LocalDate newExpiry = LocalDate.now().plusYears(2);
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.of(existing));
        when(certificationRepository.save(any(ContractorCertification.class))).thenAnswer(i -> i.getArgument(0));
        ContractorCertificationUpdateRequestDTO req = ContractorCertificationUpdateRequestDTO.builder()
                .expiryDate(newExpiry).certStatus(null).build();

        service.updateCertification("p1", "cert1", req);

        assertEquals(newExpiry, existing.getExpiryDate());
        assertEquals(CertificationStatus.VALID, existing.getCertStatus(), "status must be preserved and stay valid");
    }

    @Test
    void updateCertification_expiryInPast_derivesExpired() {
        ContractorProfile p = profile();
        ContractorCertification existing = cert(p, CertificationStatus.VALID, LocalDate.now().minusYears(2), LocalDate.now().plusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.of(existing));
        when(certificationRepository.save(any(ContractorCertification.class))).thenAnswer(i -> i.getArgument(0));
        ContractorCertificationUpdateRequestDTO req = ContractorCertificationUpdateRequestDTO.builder()
                .expiryDate(LocalDate.now().minusDays(1)).build();

        service.updateCertification("p1", "cert1", req);

        assertEquals(CertificationStatus.EXPIRED, existing.getCertStatus());
    }

    @Test
    void updateCertification_expiryBeforeIssue_throws() {
        ContractorProfile p = profile();
        ContractorCertification existing = cert(p, CertificationStatus.VALID, LocalDate.now().minusYears(1), LocalDate.now().plusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.of(existing));
        ContractorCertificationUpdateRequestDTO req = ContractorCertificationUpdateRequestDTO.builder()
                .expiryDate(LocalDate.now().minusYears(2)).build(); // before issue date
        assertThrows(BusinessValidationException.class, () -> service.updateCertification("p1", "cert1", req));
    }

    @Test
    void updateCertification_certNotOnProfile_throws() {
        ContractorProfile p = profile();
        ContractorProfile other = ContractorProfile.builder().user(p.getUser()).build();
        other.setId("other");
        ContractorCertification existing = cert(other, CertificationStatus.VALID, LocalDate.now().minusYears(1), LocalDate.now().plusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.of(existing));
        ContractorCertificationUpdateRequestDTO req = ContractorCertificationUpdateRequestDTO.builder().certStatus("revoked").build();
        assertThrows(BusinessValidationException.class, () -> service.updateCertification("p1", "cert1", req));
    }

    @Test
    void updateCertification_certNotFound_throws() {
        ContractorProfile p = profile();
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.empty());
        ContractorCertificationUpdateRequestDTO req = ContractorCertificationUpdateRequestDTO.builder().certStatus("valid").build();
        assertThrows(CertificationNotFoundException.class, () -> service.updateCertification("p1", "cert1", req));
    }

    // ---------- delete / get ----------

    @Test
    void deleteCertification_success() {
        ContractorProfile p = profile();
        ContractorCertification existing = cert(p, CertificationStatus.VALID, LocalDate.now().minusYears(1), LocalDate.now().plusMonths(1));
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.of(p));
        when(certificationRepository.findById("cert1")).thenReturn(Optional.of(existing));

        service.deleteCertification("p1", "cert1");

        verify(certificationRepository).delete(existing);
        verify(auditService).logAction(anyString(), eq("CONTRACTOR_CERTIFICATION_REMOVED"), anyString(), eq("p1"), anyString());
    }

    @Test
    void getCertificationsByProfileId_profileNotFound_throws() {
        when(contractorProfileRepository.findById("p1")).thenReturn(Optional.empty());
        assertThrows(ContractorProfileNotFoundException.class, () -> service.getCertificationsByProfileId("p1"));
    }
}

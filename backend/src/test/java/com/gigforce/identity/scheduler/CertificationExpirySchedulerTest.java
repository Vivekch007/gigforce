package com.gigforce.identity.scheduler;

import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 2 - Scheduled certification auto-expiry.
 */
@ExtendWith(MockitoExtension.class)
class CertificationExpirySchedulerTest {

    @Mock private ContractorCertificationRepository certificationRepository;

    @InjectMocks private CertificationExpiryScheduler scheduler;

    private ContractorCertification cert(String id) {
        ContractorCertification c = ContractorCertification.builder()
                .name("Cert-" + id).issuingAuthority("Body")
                .issueDate(LocalDate.now().minusYears(2)).expiryDate(LocalDate.now().minusDays(1))
                .certStatus(CertificationStatus.VALID).build();
        c.setId(id);
        return c;
    }

    @Test
    void expireOverdueCertifications_flipsValidToExpiredAndSaves() {
        ContractorCertification c1 = cert("c1");
        ContractorCertification c2 = cert("c2");
        when(certificationRepository.findByCertStatusAndExpiryDateBefore(eq(CertificationStatus.VALID), any(LocalDate.class)))
                .thenReturn(List.of(c1, c2));

        scheduler.expireOverdueCertifications();

        assertEquals(CertificationStatus.EXPIRED, c1.getCertStatus());
        assertEquals(CertificationStatus.EXPIRED, c2.getCertStatus());
        ArgumentCaptor<List<ContractorCertification>> captor = ArgumentCaptor.forClass(List.class);
        verify(certificationRepository).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    void expireOverdueCertifications_noneOverdue_doesNotSave() {
        when(certificationRepository.findByCertStatusAndExpiryDateBefore(eq(CertificationStatus.VALID), any(LocalDate.class)))
                .thenReturn(List.of());

        scheduler.expireOverdueCertifications();

        verify(certificationRepository, never()).saveAll(any());
    }

    @Test
    void expireOverdueCertifications_onlyQueriesValidCerts() {
        when(certificationRepository.findByCertStatusAndExpiryDateBefore(eq(CertificationStatus.VALID), any(LocalDate.class)))
                .thenReturn(List.of());

        scheduler.expireOverdueCertifications();

        // REVOKED / already-EXPIRED are never fetched, so they are never modified.
        verify(certificationRepository).findByCertStatusAndExpiryDateBefore(eq(CertificationStatus.VALID), any(LocalDate.class));
    }
}

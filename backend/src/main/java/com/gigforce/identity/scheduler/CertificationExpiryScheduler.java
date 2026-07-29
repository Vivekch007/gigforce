package com.gigforce.identity.scheduler;

import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Persists certification status transitions based on expiry date.
 * Any VALID certification whose expiry date has passed is flipped to EXPIRED in the database
 * (REVOKED certifications are left untouched). Runs daily; the requirement is that a
 * certificate's status changes automatically by its expiry date via backend logic.
 */
@Component
public class CertificationExpiryScheduler {

    private static final Logger logger = LoggerFactory.getLogger(CertificationExpiryScheduler.class);

    private final ContractorCertificationRepository certificationRepository;

    public CertificationExpiryScheduler(ContractorCertificationRepository certificationRepository) {
        this.certificationRepository = certificationRepository;
    }

    @Scheduled(cron = "0 15 0 * * *") // daily at 00:15
    @Transactional
    public void expireOverdueCertifications() {
        LocalDate today = LocalDate.now();
        List<ContractorCertification> overdue =
                certificationRepository.findByCertStatusAndExpiryDateBefore(CertificationStatus.VALID, today);

        if (overdue.isEmpty()) {
            return;
        }

        for (ContractorCertification cert : overdue) {
            cert.setCertStatus(CertificationStatus.EXPIRED);
        }
        certificationRepository.saveAll(overdue);
        logger.info("Auto-expired {} certification(s) with expiry date before {}", overdue.size(), today);
    }
}

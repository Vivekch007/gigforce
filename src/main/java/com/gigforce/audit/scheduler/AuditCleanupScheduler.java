package com.gigforce.audit.scheduler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import com.gigforce.audit.repository.AuditLogRepository;

@Component
public class AuditCleanupScheduler {

    @Autowired
    private AuditLogRepository auditLogRepository;

    // Runs every night at midnight
    @Scheduled(cron = "0 0 0 * * ?")
    public void cleanOldAuditLogs() {
        LocalDateTime ninetyDaysAgo = LocalDateTime.now().minusDays(90);
        auditLogRepository.deleteOlderThan(ninetyDaysAgo);
        System.out.println("Cleaned up audit logs older than " + ninetyDaysAgo);
    }
}
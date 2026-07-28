package com.gigforce.audit.service;

import com.gigforce.audit.entity.AuditLog;

import java.util.List;

public interface AuditService {
    void logAction(String userId, String action, String entityType, String entityId, String description);

    List<AuditLog> getAuditLogsForUser(String userId);

    List<AuditLog> getAllAuditLogs();
}

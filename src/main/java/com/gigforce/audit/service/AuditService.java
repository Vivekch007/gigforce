package com.gigforce.audit.service;

import com.gigforce.audit.entity.AuditLog;

import java.util.List;

public interface AuditService {
    void logAction(Long userId, String action, String entityType, Long entityId, String description);
    List<AuditLog> getAuditLogsForUser(Long userId);
}

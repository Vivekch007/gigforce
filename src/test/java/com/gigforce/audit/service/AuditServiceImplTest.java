package com.gigforce.audit.service;

import com.gigforce.audit.entity.AuditLog;
import com.gigforce.audit.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Module 1 - Identity & Access Management: AuditService unit tests.
 * Verifies audit rows are persisted with the correct fields and retrieval delegates correctly.
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceImplTest {

    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks private AuditServiceImpl auditService;

    @Test
    void logAction_persistsAuditLogWithAllFields() {
        auditService.logAction("u1", "USER_LOGIN", "USER", "u1", "User logged in");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();
        assertEquals("u1", saved.getUserId());
        assertEquals("USER_LOGIN", saved.getAction());
        assertEquals("USER", saved.getEntityType());
        assertEquals("u1", saved.getEntityId());
        assertEquals("User logged in", saved.getDescription());
    }

    @Test
    void getAuditLogsForUser_delegatesToRepository() {
        AuditLog log = AuditLog.builder().userId("u1").action("USER_LOGIN").entityType("USER").build();
        when(auditLogRepository.findByUserIdOrderByCreatedAtDesc("u1")).thenReturn(List.of(log));

        List<AuditLog> result = auditService.getAuditLogsForUser("u1");

        assertEquals(1, result.size());
        assertEquals("USER_LOGIN", result.get(0).getAction());
    }

    @Test
    void getAllAuditLogs_delegatesToRepository() {
        when(auditLogRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(
                AuditLog.builder().action("USER_LOGIN").entityType("USER").build(),
                AuditLog.builder().action("USER_LOGOUT").entityType("USER").build()));

        assertEquals(2, auditService.getAllAuditLogs().size());
    }
}

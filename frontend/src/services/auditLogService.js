import apiClient from './apiClient';

// --- Audit Log Services (/api/v1/audit) ---

export function getAllAuditLogs() {
  return apiClient.get('/audit/all').then((res) => res.data); // returns List<AuditLog>
}

export function getAuditLogsForUser(userId) {
  return apiClient.get(`/audit/user/${userId}`).then((res) => res.data);
}



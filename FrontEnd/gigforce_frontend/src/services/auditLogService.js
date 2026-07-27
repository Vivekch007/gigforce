import apiClient from './apiClient';

// --- Audit Log Services (/api/v1/audit) ---

export function getAllAuditLogs() {
  return apiClient.get('/audit/all').then((res) => res.data); // returns List<AuditLog>
}

export function getAuditLogsForUser(userId) {
  return apiClient.get(`/audit/user/${userId}`).then((res) => res.data);
}

// Fallback audit trail
const mockAuditLogs = [
  { id: '1', timestamp: '2026-07-26T10:15:30Z', user: 'admin@gigforce.com', module: 'USER_MGMT', action: 'CREATE_USER', entity: 'USER-Sarah Jenkins', status: 'SUCCESS', ipAddress: '192.168.1.5' },
  { id: '2', timestamp: '2026-07-26T10:20:12Z', user: 'admin@gigforce.com', module: 'ROLE_MGMT', action: 'ASSIGN_ROLE', entity: 'ROLE-FINANCE', status: 'SUCCESS', ipAddress: '192.168.1.5' },
  { id: '3', timestamp: '2026-07-26T10:25:40Z', user: 'unknown@hacker.com', module: 'AUTH', action: 'LOGIN_FAILED', entity: 'USER-login', status: 'FAILURE', ipAddress: '10.0.0.12' },
  { id: '4', timestamp: '2026-07-26T10:30:00Z', user: 'super_admin@gigforce.com', module: 'SETTINGS', action: 'MODIFY_SECURITY_POLICY', entity: 'SYSTEM-MFA', status: 'SUCCESS', ipAddress: '192.168.1.1' },
];

export async function getMockAuditLogs() {
  return mockAuditLogs;
}

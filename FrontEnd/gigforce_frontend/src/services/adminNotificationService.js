import apiClient from './apiClient';

// --- Admin Notifications Service ---

export function getAdminNotifications() {
  return apiClient.get('/notifications').then((res) => res.data); // List<NotificationResponseDTO>
}

// Fallback alerts
const mockAdminAlerts = [
  { NotificationID: '1', Title: 'Security Breach Warning', Message: 'Multiple failed login attempts detected from IP 10.0.0.12.', CreatedDate: new Date().toISOString(), Category: 'Security', Status: 'UNREAD' },
  { NotificationID: '2', Title: 'New User Registered', Message: 'Bob Johnson registered as a Hiring Manager.', CreatedDate: new Date(Date.now() - 3600000).toISOString(), Category: 'Users', Status: 'UNREAD' },
  { NotificationID: '3', Title: 'Platform Configuration Saved', Message: 'MFA requirement policy enabled globally by Super Admin.', CreatedDate: new Date(Date.now() - 86400000).toISOString(), Category: 'System', Status: 'READ' },
];

export async function getMockAdminAlerts() {
  return mockAdminAlerts;
}

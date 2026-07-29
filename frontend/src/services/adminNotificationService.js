import apiClient from './apiClient';

// --- Admin Notifications Service ---
// Real endpoint: GET /api/v1/notifications
// The backend returns user-scoped notifications for the authenticated admin.

export function getAdminNotifications(params) {
  // params: { status?, category?, priority?, fromDate?, toDate? }
  return apiClient.get('/notifications', { params }).then((res) => res.data);
}

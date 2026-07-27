import apiClient from './apiClient';

// --- Notification & Alert Endpoints (/api/v1/notifications) ---

export function getMyNotifications(params) {
  // params: { status?, category?, priority?, fromDate?, toDate? }
  return apiClient.get('/notifications', { params }).then((res) => res.data); // returns List<NotificationResponseDTO>
}

export function getUnreadCount() {
  return apiClient.get('/notifications/unread-count').then((res) => res.data);
}

export function getNotificationById(id) {
  return apiClient.get(`/notifications/${id}`).then((res) => res.data);
}

export function markNotificationAsRead(id) {
  return apiClient.put(`/notifications/${id}/read`).then((res) => res.data);
}

export function dismissNotification(id) {
  return apiClient.put(`/notifications/${id}/dismiss`).then((res) => res.data);
}

export function deleteNotification(id) {
  return apiClient.delete(`/notifications/${id}`).then((res) => res.data);
}

export function sendSystemNotification(payload) {
  return apiClient.post('/notifications/system', payload).then((res) => res.data);
}

export function triggerScheduledJobs() {
  return apiClient.post('/notifications/trigger-jobs').then((res) => res.data);
}

import apiClient from './apiClient';

// --- Finance Notification Service (GET /notifications) ---

export function getMyNotifications(params) {
  return apiClient.get('/notifications', { params }).then((res) => res.data); // List<NotificationResponseDTO>
}

export function markNotificationAsRead(id) {
  return apiClient.put(`/notifications/${id}/read`).then((res) => res.data);
}

export function dismissNotification(id) {
  return apiClient.put(`/notifications/${id}/dismiss`).then((res) => res.data);
}

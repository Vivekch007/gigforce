import apiClient from './apiClient';

// --- System Settings Service ---

export async function getSystemSettings() {
  return apiClient.get('/settings').then(res => res.data);
}

export async function updateSystemSettings(payload) {
  return apiClient.put('/settings', payload).then(res => res.data);
}

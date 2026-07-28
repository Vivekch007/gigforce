import apiClient from './apiClient';

// --- User Management Services (/api/v1/users) ---

export function getUsers(params) {
  // params: page, size, role, status
  return apiClient.get('/users', { params }).then((res) => res.data); // returns Page<UserResponseDTO>
}

export function getUserDetails(id) {
  return apiClient.get(`/users/${id}`).then((res) => res.data);
}

export function updateUser(id, payload) {
  // UserUpdateRequestDTO { phone }
  return apiClient.put(`/users/${id}`, payload).then((res) => res.data);
}

export function suspendUser(id) {
  return apiClient.put(`/users/${id}/suspend`).then((res) => res.data);
}

export function deactivateUser(id) {
  return apiClient.put(`/users/${id}/deactivate`).then((res) => res.data);
}

export function activateUser(id) {
  return apiClient.put(`/users/${id}/activate`).then((res) => res.data);
}

import apiClient from './apiClient';

// --- Roles & Permissions Service ---

export async function getRoles() {
  return apiClient.get('/roles').then(res => res.data);
}

export async function createRole(payload) {
  return apiClient.post('/roles', payload).then(res => res.data);
}

export async function updateRolePermissions(roleName, permissions) {
  return apiClient.put(`/roles/${roleName}/permissions`, permissions).then(res => res.data);
}

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

// Mock database fallback for creating/editing users locally
let mockUsers = [
  { id: '1', employeeId: 'EMP-94829', name: 'Sarah Jenkins', email: 'sarah.j@gigforce.com', role: 'FINANCE_MANAGER', department: 'Corporate Accounts', organization: 'GigForce HQ', status: 'ACTIVE' },
  { id: '2', employeeId: 'EMP-10294', name: 'John Doe', email: 'john.doe@gigforce.com', role: 'CONTRACTOR', department: 'Engineering', organization: 'GigForce HQ', status: 'ACTIVE' },
  { id: '3', employeeId: 'EMP-83921', name: 'Alice Smith', email: 'alice@vendor.com', role: 'VENDOR_MANAGER', department: 'Recruiting', organization: 'Staffing Solutions LLC', status: 'ACTIVE' },
  { id: '4', employeeId: 'EMP-47392', name: 'Bob Johnson', email: 'bob@manager.com', role: 'HIRING_MANAGER', department: 'Product', organization: 'Client Corp', status: 'ACTIVE' },
];

export async function createAdminUser(payload) {
  // Simulate user creation
  const newUser = {
    id: String(mockUsers.length + 1),
    employeeId: `EMP-${Math.floor(10000 + Math.random() * 90000)}`,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    department: payload.department || 'General Administration',
    organization: payload.organization || 'GigForce HQ',
    status: 'ACTIVE',
  };
  mockUsers.push(newUser);
  return newUser;
}

export async function getMockUsersList() {
  return mockUsers;
}

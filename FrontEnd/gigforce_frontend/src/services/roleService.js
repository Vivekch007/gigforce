import apiClient from './apiClient';

// --- Roles & Permissions Service ---

let mockRoles = [
  {
    roleName: 'ADMIN',
    description: 'System administration, manages users, roles, and master catalogs.',
    usersAssigned: 5,
    permissions: { read: true, create: true, update: true, delete: true, approve: true, export: true }
  },
  {
    roleName: 'HIRING_MANAGER',
    description: 'Hiring manager. Publishes requisitions, reviews candidate submissions, approves timesheets.',
    usersAssigned: 12,
    permissions: { read: true, create: true, update: true, delete: false, approve: true, export: true }
  },
  {
    roleName: 'VENDOR_MANAGER',
    description: 'Vendor organization coordinator. Submits candidates, tracks assignments, raises POs.',
    usersAssigned: 8,
    permissions: { read: true, create: true, update: true, delete: false, approve: false, export: true }
  },
  {
    roleName: 'FINANCE',
    description: 'Finance department coordinator. Approves invoices, processes payouts.',
    usersAssigned: 4,
    permissions: { read: true, create: true, update: true, delete: false, approve: true, export: true }
  },
];

export async function getRoles() {
  return mockRoles;
}

export async function createRole(payload) {
  const newRole = {
    roleName: payload.roleName.toUpperCase(),
    description: payload.description,
    usersAssigned: 0,
    permissions: payload.permissions || { read: true, create: false, update: false, delete: false, approve: false, export: false }
  };
  mockRoles.push(newRole);
  return newRole;
}

export async function updateRolePermissions(roleName, permissions) {
  mockRoles = mockRoles.map(r => {
    if (r.roleName === roleName) {
      return { ...r, permissions: { ...r.permissions, ...permissions } };
    }
    return r;
  });
  return mockRoles.find(r => r.roleName === roleName);
}

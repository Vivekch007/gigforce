import apiClient from './apiClient';

// --- Departments Management Service ---

let mockDepts = [
  { id: '1', department: 'Corporate Accounts & Finance', manager: 'Sarah Jenkins', organization: 'GigForce HQ', userCount: 4 },
  { id: '2', department: 'Software Engineering', manager: 'David Miller', organization: 'GigForce HQ', userCount: 15 },
  { id: '3', department: 'Recruitment & Operations', manager: 'Alice Smith', organization: 'Staffing Solutions LLC', userCount: 8 },
  { id: '4', department: 'Product Management', manager: 'Bob Johnson', organization: 'Client Corp', userCount: 3 },
];

export async function getDepartments() {
  return mockDepts;
}

export async function createDepartment(payload) {
  const newDept = {
    id: String(mockDepts.length + 1),
    department: payload.department,
    manager: payload.manager || 'Unassigned',
    organization: payload.organization || 'GigForce HQ',
    userCount: 0,
  };
  mockDepts.push(newDept);
  return newDept;
}

export async function updateDepartment(id, payload) {
  mockDepts = mockDepts.map(d => {
    if (d.id === id) {
      return { ...d, ...payload };
    }
    return d;
  });
  return mockDepts.find(d => d.id === id);
}

export async function deleteDepartment(id) {
  mockDepts = mockDepts.filter(d => d.id !== id);
  return true;
}

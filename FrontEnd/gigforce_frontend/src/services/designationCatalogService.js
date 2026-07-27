import apiClient from './apiClient';

// --- Designation Catalog Service ---

let mockDesignations = [
  { id: '1', name: 'Senior Accounts Officer', department: 'Corporate Accounts & Finance', grade: 'L4', status: 'ACTIVE' },
  { id: '2', name: 'Software Engineer', department: 'Software Engineering', grade: 'L2', status: 'ACTIVE' },
  { id: '3', name: 'Senior Recruiter', department: 'Recruitment & Operations', grade: 'L3', status: 'ACTIVE' },
  { id: '4', name: 'Product Manager', department: 'Product Management', grade: 'L4', status: 'ACTIVE' },
];

export async function getDesignations() {
  return mockDesignations;
}

export async function createDesignation(payload) {
  const newDesig = {
    id: String(mockDesignations.length + 1),
    name: payload.name,
    department: payload.department,
    grade: payload.grade || 'L1',
    status: 'ACTIVE',
  };
  mockDesignations.push(newDesig);
  return newDesig;
}

export async function updateDesignation(id, payload) {
  mockDesignations = mockDesignations.map(d => {
    if (d.id === id) {
      return { ...d, ...payload };
    }
    return d;
  });
  return mockDesignations.find(d => d.id === id);
}

export async function deleteDesignation(id) {
  mockDesignations = mockDesignations.filter(d => d.id !== id);
  return true;
}

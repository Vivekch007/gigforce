import apiClient from './apiClient';

// --- Organizations Management Service ---

let mockOrgs = [
  { id: '1', name: 'GigForce Headquarters', code: 'GF-HQ', address: '100 Innovation Way, Suite 400', contact: 'admin@gigforce.com', status: 'ACTIVE' },
  { id: '2', name: 'Client Corp International', code: 'CLI-CORP', address: '500 Enterprise Blvd', contact: 'billing@clientcorp.com', status: 'ACTIVE' },
  { id: '3', name: 'Staffing Solutions LLC', code: 'STAFF-SOL', address: '12 Pioneer Rd, Industrial Park', contact: 'contact@staffingsolutions.com', status: 'ACTIVE' },
];

export async function getOrganizations() {
  return mockOrgs;
}

export async function createOrganization(payload) {
  const newOrg = {
    id: String(mockOrgs.length + 1),
    name: payload.name,
    code: payload.code.toUpperCase(),
    address: payload.address,
    contact: payload.contact,
    status: 'ACTIVE',
  };
  mockOrgs.push(newOrg);
  return newOrg;
}

export async function updateOrganization(id, payload) {
  mockOrgs = mockOrgs.map(o => {
    if (o.id === id) {
      return { ...o, ...payload };
    }
    return o;
  });
  return mockOrgs.find(o => o.id === id);
}

export async function toggleOrganizationStatus(id) {
  mockOrgs = mockOrgs.map(o => {
    if (o.id === id) {
      return { ...o, status: o.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
    }
    return o;
  });
  return mockOrgs.find(o => o.id === id);
}

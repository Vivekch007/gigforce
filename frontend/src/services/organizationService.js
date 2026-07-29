import apiClient from './apiClient';

// --- Organizations Management Service ---
// Derives organizations from users.org_unit_id via GET /api/v1/users/org-units

export function getOrganizations() {
  return apiClient.get('/users/org-units').then((res) => res.data);
}

export async function toggleOrganizationStatus(id) {
  // OrgUnit status is derived from user data; toggle is a UI-only indicator
  // as there is no dedicated Organization entity in the DB schema.
  // Return a simulated toggle response to preserve UX behaviour.
  return { id, status: 'INACTIVE' };
}

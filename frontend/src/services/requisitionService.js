import apiClient from './apiClient';

// --- Requisition Services (/api/v1/requisitions) ---

export function getRequisitions(params) {
  return apiClient.get('/requisitions', { params }).then((res) => res.data); // returns Page<ResourceRequisitionResponseDTO>
}

export function getRequisitionDetails(id) {
  return apiClient.get(`/requisitions/${id}`).then((res) => res.data);
}

export function createRequisition(payload) {
  // ResourceRequisitionRequestDTO { jobTitle, department, location, employmentType, experienceYearsRequired, requiredSkillId, quantity, budget, startDate, endDate, priority, description, orgUnitId }
  return apiClient.post('/requisitions', payload).then((res) => res.data);
}

export function updateRequisition(id, payload) {
  return apiClient.put(`/requisitions/${id}`, payload).then((res) => res.data);
}

export function publishRequisition(id) {
  return apiClient.put(`/requisitions/${id}/publish`).then((res) => res.data);
}

export function cancelRequisition(id) {
  return apiClient.put(`/requisitions/${id}/cancel`).then((res) => res.data);
}

export function closeRequisition(id) {
  return apiClient.put(`/requisitions/${id}/close`).then((res) => res.data);
}

export function setRequisitionUnderReview(id) {
  return apiClient.put(`/requisitions/${id}/under-review`).then((res) => res.data);
}

export function getDepartments() {
  return apiClient.get('/requisitions/departments').then((res) => res.data);
}

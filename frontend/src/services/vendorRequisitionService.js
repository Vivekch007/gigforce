import apiClient from './apiClient';

// --- Vendor Requisition Wrapper (GET /requisitions) ---

export function getRequisitions(params) {
  // Filters: e.g. status=OPEN, jobTitle, page, size
  return apiClient.get('/requisitions', { params }).then((res) => res.data); // returns Page<ResourceRequisitionResponseDTO>
}

export function getRequisitionDetails(id) {
  return apiClient.get(`/requisitions/${id}`).then((res) => res.data);
}

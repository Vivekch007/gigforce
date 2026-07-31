import apiClient from './apiClient';

// --- Vendor Requisition Wrapper (GET /requisitions) ---

export function getRequisitions(params) {
  // Map frontend params to backend controller expected params
  const mappedParams = {
    ...params,
    jobTitle: params.search,
    requiredSkillId: params.skill
  };
  return apiClient.get('/requisitions', { params: mappedParams }).then((res) => res.data); // returns Page<ResourceRequisitionResponseDTO>
}

export function getRequisitionDetails(id) {
  return apiClient.get(`/requisitions/${id}`).then((res) => res.data);
}

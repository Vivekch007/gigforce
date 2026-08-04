import apiClient from './apiClient';

// --- Vendor Submissions Mappings (/api/v1/submissions) ---

export function getSubmissions(params) {
  return apiClient.get('/submissions', { params }).then((res) => ({
    content: res.data?.content || [],
    totalPages: res.data?.totalPages || 1,
    totalElements: res.data?.totalElements || 0
  }));
}

export function getSubmissionDetails(id) {
  return apiClient.get(`/submissions/${id}`).then((res) => res.data);
}

export function submitCandidateToRequisition(reqId, payload) {
  // VendorSubmissionRequestDTO { contractorProfileId, proposedRate }
  return apiClient.post(`/submissions/requisitions/${reqId}/submit`, payload).then((res) => res.data);
}

export function withdrawSubmission(id, remarks) {
  return apiClient.put(`/submissions/${id}/withdraw`, null, { params: { remarks } }).then((res) => res.data);
}

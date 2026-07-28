import apiClient from './apiClient';

// --- Vendor Submissions Endpoints (/api/v1/submissions) ---

export function getSubmissionsByRequisition(reqId) {
  return apiClient.get(`/submissions/requisitions/${reqId}`).then((res) => res.data); // returns List<VendorSubmissionResponseDTO>
}

export function getSubmissionDetails(id) {
  return apiClient.get(`/submissions/${id}`).then((res) => res.data);
}

export function shortlistSubmission(id) {
  return apiClient.put(`/submissions/${id}/shortlist`).then((res) => res.data);
}

export function transitionSubmissionToScheduled(id) {
  return apiClient.put(`/submissions/${id}/schedule-interview`).then((res) => res.data);
}

export function selectSubmission(id, remarks) {
  return apiClient.put(`/submissions/${id}/select`, null, { params: { remarks } }).then((res) => res.data);
}

export function rejectSubmission(id, remarks) {
  return apiClient.put(`/submissions/${id}/reject`, null, { params: { remarks } }).then((res) => res.data);
}

export function searchSubmissions(params) {
  // params: { requisitionId?, status?, contractorProfileId?, page?, size? }
  return apiClient.get('/submissions', { params }).then((res) => res.data); // returns Page<VendorSubmissionResponseDTO>
}

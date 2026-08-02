import apiClient from './apiClient';

// --- Assignments Management (/api/v1/assignments) ---

export function getAssignments(params) {
  return apiClient.get('/assignments', { params }).then((res) => res.data); // Page<AssignmentResponseDTO>
}

export function getAssignmentDetails(id) {
  return apiClient.get(`/assignments/${id}`).then((res) => res.data);
}

export function completeAssignment(id) {
  // Sets status to COMPLETED
  return apiClient.put(`/assignments/${id}/complete`).then((res) => res.data);
}

// --- Contract Amendments ---

export function requestAmendment(assignmentId, payload) {
  // AmendmentRequestDTO { amendmentType, effectiveDate, newValue, remarks? }
  return apiClient.post(`/assignments/${assignmentId}/amendments`, payload).then((res) => res.data);
}

export function getAssignmentAmendments(assignmentId) {
  return apiClient.get(`/assignments/${assignmentId}/amendments`).then((res) => res.data);
}

export function getPendingAmendments() {
  return apiClient.get('/amendments/pending').then((res) => res.data);
}

export function approveAmendment(id, remarks) {
  return apiClient.put(`/amendments/${id}/approve`, null, { params: { remarks } }).then((res) => res.data);
}

export function rejectAmendment(id, remarks) {
  return apiClient.put(`/amendments/${id}/reject`, null, { params: { remarks } }).then((res) => res.data);
}

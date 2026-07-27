import apiClient from './apiClient';

// --- Assignments Endpoints ---

export function getAssignments(params) {
  return apiClient.get('/assignments', { params }).then((res) => res.data); // returns Page<AssignmentResponseDTO>
}

export function getAssignmentDetails(id) {
  return apiClient.get(`/assignments/${id}`).then((res) => res.data);
}

export function createAssignment(payload) {
  return apiClient.post('/assignments', payload).then((res) => res.data);
}

export function cancelAssignment(id) {
  return apiClient.put(`/assignments/${id}/cancel`).then((res) => res.data);
}

export function completeAssignment(id) {
  return apiClient.put(`/assignments/${id}/complete`).then((res) => res.data);
}

// --- Amendments Endpoints ---

export function getAssignmentAmendments(assignmentId) {
  return apiClient.get(`/assignments/${assignmentId}/amendments`).then((res) => res.data);
}

export function requestAmendment(assignmentId, payload) {
  // AmendmentRequestDTO { amendmentType, effectiveDate, newValue, remarks? }
  return apiClient.post(`/assignments/${assignmentId}/amendments`, payload).then((res) => res.data);
}

export function approveAmendment(amendmentId, remarks) {
  return apiClient.put(`/amendments/${amendmentId}/approve`, null, { params: { remarks } }).then((res) => res.data);
}

export function rejectAmendment(amendmentId, remarks) {
  return apiClient.put(`/amendments/${amendmentId}/reject`, null, { params: { remarks } }).then((res) => res.data);
}

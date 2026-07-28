import apiClient from './apiClient';

// --- Vendor Assignments Placements (/api/v1/assignments) ---

export function getAssignments(params) {
  return apiClient.get('/assignments', { params }).then((res) => res.data?.content || []);
}

export function getAssignmentDetails(id) {
  return apiClient.get(`/assignments/${id}`).then((res) => res.data);
}

export function requestAssignmentExtension(assignmentId, payload) {
  // AmendmentRequestDTO { amendmentType: 'EXTENSION', effectiveDate, newValue, remarks }
  return apiClient.post(`/assignments/${assignmentId}/amendments`, {
    amendmentType: 'EXTENSION',
    ...payload
  }).then((res) => res.data);
}

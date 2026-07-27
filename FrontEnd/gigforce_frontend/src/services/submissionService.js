import apiClient from './apiClient';

// --- Vendor Submissions Mappings (/api/v1/submissions) ---

export function getSubmissions(params) {
  return apiClient.get('/submissions', { params }).then((res) => res.data?.content || []); // returns list of submissions from Page
}

export function getSubmissionDetails(id) {
  return apiClient.get(`/submissions/${id}`).then((res) => res.data);
}

export function submitCandidateToRequisition(reqId, payload) {
  // VendorSubmissionRequestDTO { contractorProfileId, proposedRate }
  return apiClient.post(`/submissions/requisitions/${reqId}/submit`, payload).then((res) => res.data);
}

export function withdrawSubmission(id) {
  // Simulated candidate withdraw action
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, status: 'REJECTED', remarks: 'Withdrawn by Vendor Partner' });
    }, 200);
  });
}

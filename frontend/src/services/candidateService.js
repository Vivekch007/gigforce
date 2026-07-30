import apiClient from './apiClient';

export function getCandidates() {
  return apiClient.get('/candidates').then(res => res.data);
}

export function addCandidate(payload) {
  return apiClient.post('/candidates', payload).then(res => res.data);
}

export function updateCandidate(id, payload) {
  return apiClient.put(`/candidates/${id}`, payload).then(res => res.data);
}

export function deleteCandidate(id) {
  return apiClient.delete(`/candidates/${id}`).then(res => res.data);
}

export function uploadCandidateResume(id, fileName) {
  return apiClient.post(`/candidates/${id}/resume`, { fileName }).then(res => res.data);
}

import apiClient from './apiClient';

export function getInterviews() {
  return apiClient.get('/vendor/interviews').then(res => res.data);
}

export function confirmInterview(id) {
  return apiClient.put(`/vendor/interviews/${id}/confirm`).then(res => res.data);
}

export function requestInterviewReschedule(id, reason) {
  return apiClient.put(`/vendor/interviews/${id}/reschedule`, { reason }).then(res => res.data);
}

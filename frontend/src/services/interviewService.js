import apiClient from './apiClient';

export function getInterviews() {
  return apiClient.get('/interviews').then(res => res.data);
}

export function scheduleInterview(payload) {
  return apiClient.post('/interviews/schedule-interview', payload).then(res => res.data);
}

export function rescheduleInterview(id, payload) {
  return apiClient.put(`/interviews/${id}/reschedule`, payload).then(res => res.data);
}

export function completeInterview(id, feedback) {
  return apiClient.put(`/interviews/${id}/complete`, { feedback }).then(res => res.data);
}

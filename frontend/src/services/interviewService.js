import apiClient from './apiClient';

export function getInterviews() {
  return apiClient.get('/interviews').then(res => {
    return Array.isArray(res.data) ? res.data : (res.data?.content || []);
  });
}

export function scheduleInterview(payload) {
  // Normalize payload keys for Spring Boot validation
  const formattedPayload = {
    candidateName: payload.candidateName,
    vendorSubmissionId: payload.vendorSubmissionId || payload.submissionId,
    date: payload.date,
    time: payload.time,
    interviewer: payload.interviewer,
  };

  return apiClient.post('/interviews/schedule-interview', formattedPayload).then(res => res.data);
}

export function rescheduleInterview(id, payload) {
  return apiClient.put(`/interviews/${id}/reschedule`, payload).then(res => res.data);
}

export function completeInterview(id, payload) {
  const requestBody = typeof payload === 'string' 
    ? { feedback: payload } 
    : { feedback: payload.feedback || '', rating: payload.rating ? String(payload.rating) : '' };
  return apiClient.put(`/interviews/${id}/complete`, requestBody).then(res => res.data);
}

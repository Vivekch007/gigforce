import apiClient from './apiClient';

export function getInterviews(params) {
  return apiClient.get('/interviews', { params }).then(res => {
    const content = (res.data?.content || []).map(i => ({
      ...i,
      position: i.interviewType || 'Interview',
      clientName: i.scheduledByEmail || 'Hiring Manager',
      interviewerName: i.scheduledByEmail || 'Interviewer',
    }));
    return {
      content,
      totalPages: res.data?.totalPages || 1,
      totalElements: res.data?.totalElements || 0
    };
  });
}

export function confirmInterview(id) {
  // Simulated endpoint for vendor confirmation
  return new Promise(resolve => setTimeout(() => resolve({ id, status: 'CONFIRMED' }), 300));
}

export function requestInterviewReschedule(id, reason) {
  // Simulated endpoint for vendor requesting reschedule
  return new Promise(resolve => setTimeout(() => resolve({ id, status: 'RESCHEDULE_REQUESTED', reason }), 300));
}

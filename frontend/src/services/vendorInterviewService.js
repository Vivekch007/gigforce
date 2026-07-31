import apiClient from './apiClient';

export function getInterviews() {
  return apiClient.get('/interviews').then(res => {
    return (res.data || []).map(i => ({
      ...i,
      position: i.interviewType || 'Interview',
      clientName: i.scheduledByEmail || 'Hiring Manager',
      interviewerName: i.scheduledByEmail || 'Interviewer',
    }));
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

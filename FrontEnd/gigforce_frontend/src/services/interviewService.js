// --- Interview Service Abstraction (Simulated API backend) ---

let mockInterviews = [
  {
    id: 'int1',
    candidateName: 'Jane Smith',
    submissionId: 'sub1',
    date: '2026-07-28',
    time: '10:00 AM',
    interviewer: 'John Doe',
    status: 'SCHEDULED',
    feedback: ''
  },
  {
    id: 'int2',
    candidateName: 'Robert Johnson',
    submissionId: 'sub2',
    date: '2026-07-29',
    time: '02:30 PM',
    interviewer: 'John Doe',
    status: 'SCHEDULED',
    feedback: ''
  }
];

export function getInterviews() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...mockInterviews]);
    }, 300);
  });
}

export function scheduleInterview(payload) {
  // payload: { candidateName, submissionId, date, time, interviewer }
  return new Promise((resolve) => {
    setTimeout(() => {
      const newInt = {
        id: `int${mockInterviews.length + 1}`,
        status: 'SCHEDULED',
        feedback: '',
        ...payload
      };
      mockInterviews.push(newInt);
      resolve(newInt);
    }, 300);
  });
}

export function rescheduleInterview(id, payload) {
  // payload: { date, time }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockInterviews.findIndex(i => i.id === id);
      if (index === -1) return reject(new Error('Interview not found'));
      mockInterviews[index] = { ...mockInterviews[index], ...payload };
      resolve(mockInterviews[index]);
    }, 300);
  });
}

export function completeInterview(id, feedback) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockInterviews.findIndex(i => i.id === id);
      if (index === -1) return reject(new Error('Interview not found'));
      mockInterviews[index] = { 
        ...mockInterviews[index], 
        status: 'COMPLETED',
        feedback 
      };
      resolve(mockInterviews[index]);
    }, 300);
  });
}

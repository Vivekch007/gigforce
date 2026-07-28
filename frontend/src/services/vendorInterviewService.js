// --- Vendor Interviews Service (Simulated Service Wrapper) ---

let mockInterviews = [
  {
    id: 'int1',
    candidateName: 'Michael Johnson',
    clientName: 'Google Cloud BU',
    position: 'Senior Java Architect',
    date: '2026-07-28',
    time: '10:00 AM',
    status: 'SCHEDULED',
    feedback: ''
  },
  {
    id: 'int2',
    candidateName: 'Emily Davis',
    clientName: 'Meta Apps BU',
    position: 'Frontend React Lead',
    date: '2026-07-29',
    time: '02:30 PM',
    status: 'CONFIRMED',
    feedback: ''
  }
];

export function getInterviews() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...mockInterviews]);
    }, 200);
  });
}

export function confirmInterview(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockInterviews.findIndex(i => i.id === id);
      if (index === -1) return reject(new Error('Interview not found'));
      mockInterviews[index].status = 'CONFIRMED';
      resolve(mockInterviews[index]);
    }, 200);
  });
}

export function requestInterviewReschedule(id, reason) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockInterviews.findIndex(i => i.id === id);
      if (index === -1) return reject(new Error('Interview not found'));
      mockInterviews[index].status = 'RESCHEDULE_REQUESTED';
      mockInterviews[index].feedback = `Reschedule reason: ${reason}`;
      resolve(mockInterviews[index]);
    }, 200);
  });
}

// --- Candidate Database Service (Simulated Service Wrapper with Mock DB) ---

let mockCandidates = [
  {
    id: 'cand1',
    name: 'Michael Johnson',
    email: 'michael.j@example.com',
    phone: '555-0199',
    skills: 'Java, Spring Boot, MySQL',
    experience: 5,
    noticePeriod: '30 Days',
    currentCompany: 'Tech Solutions Inc',
    preferredLocation: 'Remote',
    availability: 'AVAILABLE',
    rate: 450,
    resumeUrl: 'resume_michael_johnson.pdf',
  },
  {
    id: 'cand2',
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '555-0188',
    skills: 'React, TypeScript, Bootstrap',
    experience: 4,
    noticePeriod: 'Immediate',
    currentCompany: 'Creative Web Corp',
    preferredLocation: 'On-Site',
    availability: 'AVAILABLE',
    rate: 400,
    resumeUrl: 'resume_emily_davis.pdf',
  },
  {
    id: 'cand3',
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    phone: '555-0177',
    skills: 'AWS, Kubernetes, Terraform',
    experience: 6,
    noticePeriod: '15 Days',
    currentCompany: 'CloudOps Systems',
    preferredLocation: 'Hybrid',
    availability: 'AVAILABLE',
    rate: 550,
    resumeUrl: '',
  }
];

export function getCandidates() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...mockCandidates]);
    }, 200);
  });
}

export function addCandidate(payload) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newCand = {
        id: `cand${mockCandidates.length + 1}`,
        resumeUrl: '',
        ...payload,
      };
      mockCandidates.push(newCand);
      resolve(newCand);
    }, 200);
  });
}

export function updateCandidate(id, payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockCandidates.findIndex(c => c.id === id);
      if (index === -1) return reject(new Error('Candidate not found'));
      mockCandidates[index] = { ...mockCandidates[index], ...payload };
      resolve(mockCandidates[index]);
    }, 200);
  });
}

export function deleteCandidate(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockCandidates.findIndex(c => c.id === id);
      if (index === -1) return reject(new Error('Candidate not found'));
      mockCandidates.splice(index, 1);
      resolve({ success: true });
    }, 200);
  });
}

export function uploadCandidateResume(id, fileName) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockCandidates.findIndex(c => c.id === id);
      if (index === -1) return reject(new Error('Candidate not found'));
      mockCandidates[index].resumeUrl = fileName;
      resolve(mockCandidates[index]);
    }, 200);
  });
}

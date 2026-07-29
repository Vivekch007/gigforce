// --- Candidate Database Service (Simulated Service Wrapper with Mock DB) ---

let mockCandidates = [];

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

import apiClient from './apiClient';

export function getCandidates() {
  return apiClient.get('/contractors/profiles').then(res => {
    return (res.data?.content || []).map(p => ({
      id: p.id,
      name: p.displayName || p.userName,
      email: p.userEmail,
      phone: p.phone || '',
      skills: p.skills ? p.skills.map(s => s.skillName).join(', ') : '',
      experience: p.experienceYears || 0,
      noticePeriod: 'Immediate',
      currentCompany: 'Freelance',
      preferredLocation: p.preferredEngagementType || 'Remote',
      availability: p.availabilityStatus,
      rate: p.hourlyRate || 0,
      resumeUrl: null
    }));
  });
}

export function addCandidate(payload) {
  return new Promise(resolve => setTimeout(() => resolve(payload), 300));
}

export function updateCandidate(id, payload) {
  return new Promise(resolve => setTimeout(() => resolve(payload), 300));
}

export function deleteCandidate(id) {
  return new Promise(resolve => setTimeout(() => resolve({ id }), 300));
}

export function uploadCandidateResume(id, fileName) {
  return new Promise(resolve => setTimeout(() => resolve({ id, fileName }), 300));
}

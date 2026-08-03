import apiClient from './apiClient';

export function getCandidates(params = {}) {
  // Vendor-scoped candidate pool endpoint - filter set matches the CandidateDatabase page's filters.
  return apiClient.get('/contractors/profiles/vendor-pool', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 10,
      name: params.name || undefined,
      availability: params.availability || undefined,
      skill: params.skill || undefined,
      minExperience: params.minExperience || undefined,
      availableFromDate: params.availableFromDate || undefined,
      minHourlyRate: params.minHourlyRate || undefined,
    },
  }).then(res => {
    return {
      totalPages: res.data?.totalPages ?? 1,
      content: (res.data?.content || []).map(p => ({
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
      })),
    };
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

import apiClient from './apiClient';

// --- Contractor Profile endpoints (/api/v1/contractors/profiles) ---

export function getMyProfile() {
  return apiClient.get('/contractors/profiles/me').then((res) => res.data);
}

export function getProfileById(id) {
  return apiClient.get(`/contractors/profiles/${id}`).then((res) => res.data);
}

export function updateProfile(id, payload) {
  return apiClient.put(`/contractors/profiles/${id}`, payload).then((res) => res.data);
}

export function updateProfileStatus(id, status) {
  return apiClient.put(`/contractors/profiles/${id}/status`, { status }).then((res) => res.data);
}

// --- Skills mapping ---
export function addProfileSkill(profileId, payload) {
  // SkillAssociationRequestDTO { skillId, proficiencyLevel, yearsOfExperience }
  return apiClient.post(`/contractors/profiles/${profileId}/skills`, payload).then((res) => res.data);
}

export function deleteProfileSkill(profileId, skillId) {
  return apiClient.delete(`/contractors/profiles/${profileId}/skills/${skillId}`).then((res) => res.data);
}

// --- Certifications mapping ---
export function getProfileCerts(profileId) {
  return apiClient.get(`/contractors/profiles/${profileId}/certifications`).then((res) => res.data);
}

export function addProfileCert(profileId, payload) {
  // ContractorCertificationRequestDTO { name, issuingAuthority, issueDate, expiryDate, certificateNumber? }
  return apiClient.post(`/contractors/profiles/${profileId}/certifications`, payload).then((res) => res.data);
}

export function deleteProfileCert(profileId, certId) {
  return apiClient.delete(`/contractors/profiles/${profileId}/certifications/${certId}`).then((res) => res.data);
}

// --- Engagement history ---
export function getProfileEngagements(profileId) {
  return apiClient.get(`/contractors/profiles/${profileId}/engagements`).then((res) => res.data);
}

export function addProfileEngagement(profileId, payload) {
  // EngagementHistoryRequestDTO { clientName, roleTitle, startDate, endDate?, rating?, feedback?, verifyer_name, verifyer_email, verifyer_phone }
  return apiClient.post(`/contractors/profiles/${profileId}/engagements`, payload).then((res) => res.data);
}

// --- Leave and Absences ---
export function getAbsences(params) {
  return apiClient.get('/absences', { params }).then((res) => res.data);
}

export function getAbsenceDetails(id) {
  return apiClient.get(`/absences/${id}`).then((res) => res.data);
}

export function requestAbsence(payload) {
  // AbsenceRequestDTO { assignmentId, startDate, endDate, absenceType, duration, reason }
  return apiClient.post('/absences', payload).then((res) => res.data);
}

export function getSkills() {
  return apiClient.get('/skills').then((res) => res.data);
}

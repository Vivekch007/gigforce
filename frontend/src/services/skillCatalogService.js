import apiClient from './apiClient';

// --- Master Skills Catalog Management (/api/v1/skills) ---

export function getSkills(params) {
  // params: category, name
  return apiClient.get('/skills', { params }).then((res) => res.data); // returns List<SkillResponseDTO>
}

export function createSkill(payload) {
  // SkillRequestDTO { name, category, description }
  return apiClient.post('/skills', payload).then((res) => res.data);
}

export function deleteSkill(id) {
  return apiClient.delete(`/skills/${id}`).then((res) => res.data);
}

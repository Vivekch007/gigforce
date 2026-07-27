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

// Fallback catalog list to support full details (levels, statuses)
let mockSkillsCatalog = [
  { id: '1', name: 'Java', category: 'Programming Languages', level: 'Expert', status: 'ACTIVE', createdBy: 'Admin', lastUpdated: '2026-07-25' },
  { id: '2', name: 'React.js', category: 'Frontend', level: 'Advanced', status: 'ACTIVE', createdBy: 'Admin', lastUpdated: '2026-07-25' },
  { id: '3', name: 'Spring Boot', category: 'Backend', level: 'Expert', status: 'ACTIVE', createdBy: 'Admin', lastUpdated: '2026-07-24' },
  { id: '4', name: 'MySQL', category: 'Database', level: 'Intermediate', status: 'ACTIVE', createdBy: 'Admin', lastUpdated: '2026-07-23' },
];

export async function getMockCatalogSkills() {
  return mockSkillsCatalog;
}

export async function addCatalogSkill(payload) {
  const newSkill = {
    id: String(mockSkillsCatalog.length + 1),
    name: payload.name,
    category: payload.category,
    level: payload.level || 'Intermediate',
    status: 'ACTIVE',
    createdBy: payload.createdBy || 'Admin',
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  mockSkillsCatalog.push(newSkill);
  return newSkill;
}

export async function editCatalogSkill(id, payload) {
  mockSkillsCatalog = mockSkillsCatalog.map(s => {
    if (s.id === id) {
      return { ...s, ...payload, lastUpdated: new Date().toISOString().split('T')[0] };
    }
    return s;
  });
  return mockSkillsCatalog.find(s => s.id === id);
}

export async function deleteCatalogSkill(id) {
  mockSkillsCatalog = mockSkillsCatalog.filter(s => s.id !== id);
  return true;
}

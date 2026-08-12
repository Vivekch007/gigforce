import apiClient from './apiClient';

// --- Analytics & Reporting Endpoints (/api/v1/reports) ---

export function getPersonalDashboard() {
  return apiClient.get('/reports/personal-dashboard').then((res) => res.data); // returns PersonalDashboardResponseDTO
}


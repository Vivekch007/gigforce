import apiClient from './apiClient';

// --- Vendor Timesheets Review (GET /timesheets) ---

export function getTimesheets(params) {
  // Filters: contractorName, status, page, size
  return apiClient.get('/timesheets', { params }).then((res) => res.data); // returns List<TimesheetResponseDTO> or Page
}

export function getTimesheetDetails(id) {
  return apiClient.get(`/timesheets/${id}`).then((res) => res.data);
}

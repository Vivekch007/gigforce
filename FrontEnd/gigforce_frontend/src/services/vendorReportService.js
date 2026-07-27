import apiClient from './apiClient';

// --- Vendor Report Analytics Service (/api/v1/reports) ---

export function getVendorScorecard(vendorId) {
  return apiClient.get(`/reports/vendor-scorecard/${vendorId}`).then((res) => res.data); // VendorScorecardResponseDTO
}

export function searchFilteredReport(params) {
  return apiClient.get('/reports/search', { params }).then((res) => res.data); // ExecutiveDashboardResponseDTO
}

// --- CSV Report rows ( HMs and Vendors are authorized to view contractor, requisition, and timesheet reports ) ---

export function getContractorReport() {
  return apiClient.get('/reports/contractor-report').then((res) => res.data);
}

export function getAssignmentReport() {
  return apiClient.get('/reports/assignment-report').then((res) => res.data);
}

export function getTimesheetReport() {
  return apiClient.get('/reports/timesheet-report').then((res) => res.data);
}

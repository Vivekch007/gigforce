import apiClient from './apiClient';

// --- Analytics & Reports for Hiring Managers (/api/v1/reports) ---

export function getBusinessUnitDashboard(bu) {
  return apiClient.get(`/reports/business-unit/${bu}`).then((res) => res.data); // BusinessUnitDashboardResponseDTO
}

export function getExecutiveDashboard(days = 30) {
  return apiClient.get('/reports/executive-dashboard', { params: { days } }).then((res) => res.data);
}

export function searchFilteredReport(params) {
  return apiClient.get('/reports/search', { params }).then((res) => res.data); // ExecutiveDashboardResponseDTO
}

// --- CSV Report rows ( HMs are authorized to view contractor, requisition, assignment, and timesheet reports ) ---

export function getContractorReport() {
  return apiClient.get('/reports/contractor-report').then((res) => res.data);
}

export function getRequisitionReport() {
  return apiClient.get('/reports/requisition-report').then((res) => res.data);
}

export function getAssignmentReport() {
  return apiClient.get('/reports/assignment-report').then((res) => res.data);
}

export function getTimesheetReport() {
  return apiClient.get('/reports/timesheet-report').then((res) => res.data);
}

export function getInvoiceReport() {
  return apiClient.get('/reports/invoice-report').then((res) => res.data);
}

import apiClient from './apiClient';

// --- Analytics & Reporting Endpoints (/api/v1/reports) ---

export function getPersonalDashboard() {
  return apiClient.get('/reports/personal-dashboard').then((res) => res.data); // returns PersonalDashboardResponseDTO
}

export function searchFilteredReport(params) {
  return apiClient.get('/reports/search', { params }).then((res) => res.data);
}

export function generateReport(payload) {
  return apiClient.post('/reports/generate', payload).then((res) => res.data);
}

export function getAllReports() {
  return apiClient.get('/reports').then((res) => res.data);
}

export function getReportById(id) {
  return apiClient.get(`/reports/${id}`).then((res) => res.data);
}

// --- CSV Report rows (self-scoped) ---
export function getContractorReport() {
  return apiClient.get('/reports/contractor-report').then((res) => res.data);
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

export function getPaymentReport() {
  return apiClient.get('/reports/payment-report').then((res) => res.data);
}

export function getComplianceReport() {
  return apiClient.get('/reports/compliance-report').then((res) => res.data);
}

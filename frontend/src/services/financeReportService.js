import apiClient from './apiClient';

// --- Finance Reports Service (/api/v1/reports) ---

export function getExecutiveDashboard() {
  return apiClient.get('/reports/search').then((res) => res.data); // ExecutiveDashboardResponseDTO
}

export function getInvoiceReport() {
  return apiClient.get('/reports/contractor-report').then((res) => res.data);
}

export function getPaymentReport() {
  return apiClient.get('/reports/timesheet-report').then((res) => res.data);
}

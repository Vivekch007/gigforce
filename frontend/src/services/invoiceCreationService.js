import apiClient from './apiClient';

// --- Invoice Creation (/api/v1/invoices) ---

export function getInvoices(params) {
  return apiClient.get('/invoices', { params }).then((res) => res.data); // returns List<ContractorInvoiceResponseDTO>
}

export function createInvoice(payload) {
  // ContractorInvoiceRequestDTO { assignmentId, invoicePeriod, timesheetIds, billingStartDate, billingEndDate }
  return apiClient.post('/invoices', payload).then((res) => res.data);
}

export function submitInvoice(id) {
  return apiClient.put(`/invoices/${id}/submit`).then((res) => res.data);
}

export function getApprovedTimesheetsForAssignment(assignmentId) {
  // Retrieve approved timesheets for a given assignment that have NOT been billed yet (optional filter)
  return apiClient.get('/timesheets', { params: { assignmentId, status: 'APPROVED' } }).then((res) => res.data);
}

export function previewMonthlyInvoices(year, month) {
  return apiClient.get('/invoices/generate-monthly/preview', { params: { year, month } }).then((res) => res.data);
}

export function generateMonthlyInvoices(year, month) {
  return apiClient.post('/invoices/generate-monthly', { year, month }).then((res) => res.data);
}

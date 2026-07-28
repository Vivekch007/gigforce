import apiClient from './apiClient';

// --- Invoices Endpoints (/api/v1/invoices) ---

export function getInvoices(params) {
  return apiClient.get('/invoices', { params }).then((res) => res.data); // returns List<ContractorInvoiceResponseDTO>
}

export function getInvoiceDetails(id) {
  return apiClient.get(`/invoices/${id}`).then((res) => res.data);
}

export function createInvoice(payload) {
  // ContractorInvoiceRequestDTO { purchaseOrderId, assignmentId, invoiceNumber, billingStartDate, billingEndDate, totalRegularHours, totalOvertimeHours, taxAmount }
  return apiClient.post('/invoices', payload).then((res) => res.data);
}

export function updateInvoice(id, payload) {
  return apiClient.put(`/invoices/${id}`, payload).then((res) => res.data);
}

export function submitInvoice(id) {
  return apiClient.put(`/invoices/${id}/submit`).then((res) => res.data);
}

export function cancelInvoice(id) {
  return apiClient.put(`/invoices/${id}/cancel`).then((res) => res.data);
}

export function approveInvoice(id) {
  return apiClient.put(`/invoices/${id}/approve`).then((res) => res.data);
}

export function rejectInvoice(id) {
  return apiClient.put(`/invoices/${id}/reject`).then((res) => res.data);
}

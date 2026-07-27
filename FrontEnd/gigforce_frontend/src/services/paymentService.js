import apiClient from './apiClient';

// --- Payments Endpoints (/api/v1/payments) ---

export function getPayments() {
  return apiClient.get('/payments').then((res) => res.data); // returns List<PaymentResponseDTO>
}

export function getPaymentById(id) {
  return apiClient.get(`/payments/${id}`).then((res) => res.data);
}

export function createPayment(payload) {
  // PaymentCreateRequestDTO { invoiceId, paidAmount, paymentDate, paymentMode }
  return apiClient.post('/payments', payload).then((res) => res.data);
}

export function updatePayment(id, payload) {
  return apiClient.put(`/payments/${id}`, payload).then((res) => res.data);
}

export function processPayment(id) {
  return apiClient.put(`/payments/${id}/process`).then((res) => res.data);
}

export function failPayment(id) {
  return apiClient.put(`/payments/${id}/fail`).then((res) => res.data);
}

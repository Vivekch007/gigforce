import apiClient from './apiClient';

// --- Vendor Purchase Order Service (/api/v1/purchase-orders) ---

export function getPurchaseOrders() {
  return apiClient.get('/purchase-orders').then((res) => res.data); // returns List<PurchaseOrderResponseDTO>
}

export function getPurchaseOrderDetails(id) {
  return apiClient.get(`/purchase-orders/${id}`).then((res) => res.data);
}

export function createPurchaseOrder(payload) {
  // PurchaseOrderRequestDTO { assignmentId, vendorId, poAmount, currency }
  return apiClient.post('/purchase-orders', payload).then((res) => res.data);
}

export function approvePurchaseOrder(id) {
  return apiClient.put(`/purchase-orders/${id}/approve`).then((res) => res.data);
}

export function cancelPurchaseOrder(id) {
  return apiClient.put(`/purchase-orders/${id}/cancel`).then((res) => res.data);
}

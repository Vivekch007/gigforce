import apiClient from './apiClient';

// --- Finance Purchase Order Service (/api/v1/purchase-orders) ---

export function getPurchaseOrders() {
  return apiClient.get('/purchase-orders').then((res) => res.data); // returns List<PurchaseOrderResponseDTO>
}

export function getPurchaseOrderDetails(id) {
  return apiClient.get(`/purchase-orders/${id}`).then((res) => res.data);
}

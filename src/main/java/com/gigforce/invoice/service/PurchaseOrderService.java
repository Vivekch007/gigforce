package com.gigforce.invoice.service;

import com.gigforce.invoice.dto.PurchaseOrderRequestDTO;
import com.gigforce.invoice.dto.PurchaseOrderResponseDTO;

import java.util.List;

public interface PurchaseOrderService {

    PurchaseOrderResponseDTO createPurchaseOrder(PurchaseOrderRequestDTO request);

    PurchaseOrderResponseDTO getPurchaseOrderById(String id);

    List<PurchaseOrderResponseDTO> getAllPurchaseOrders();

    PurchaseOrderResponseDTO cancelPurchaseOrder(String id);
}

package com.gigforce.invoice.controller;

import com.gigforce.invoice.dto.PurchaseOrderRequestDTO;
import com.gigforce.invoice.dto.PurchaseOrderResponseDTO;
import com.gigforce.invoice.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@Tag(name = "Purchase Order Management", description = "Endpoints for creating and tracking purchase orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    // PO is raised by the Vendor / Vendor Manager (Admin retains full-access override)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR', 'VENDOR_MANAGER') or hasAnyAuthority('ADMIN', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Create a new Purchase Order (Vendor / Vendor Manager)")
    public ResponseEntity<PurchaseOrderResponseDTO> createPurchaseOrder(@Valid @RequestBody PurchaseOrderRequestDTO request) {
        PurchaseOrderResponseDTO response = purchaseOrderService.createPurchaseOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER') or hasAnyAuthority('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Get Purchase Order details by ID")
    public ResponseEntity<PurchaseOrderResponseDTO> getPurchaseOrderById(@PathVariable String id) {
        PurchaseOrderResponseDTO response = purchaseOrderService.getPurchaseOrderById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER') or hasAnyAuthority('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Get all Purchase Orders")
    public ResponseEntity<List<PurchaseOrderResponseDTO>> getAllPurchaseOrders() {
        List<PurchaseOrderResponseDTO> response = purchaseOrderService.getAllPurchaseOrders();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER') or hasAnyAuthority('ADMIN', 'FINANCE', 'HIRING_MANAGER')")
    @Operation(summary = "Cancel a Purchase Order")
    public ResponseEntity<PurchaseOrderResponseDTO> cancelPurchaseOrder(@PathVariable String id) {
        PurchaseOrderResponseDTO response = purchaseOrderService.cancelPurchaseOrder(id);
        return ResponseEntity.ok(response);
    }
}
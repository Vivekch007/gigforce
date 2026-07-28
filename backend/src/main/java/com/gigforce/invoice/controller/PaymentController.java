package com.gigforce.invoice.controller;

import com.gigforce.invoice.dto.PaymentCreateRequestDTO;
import com.gigforce.invoice.dto.PaymentUpdateRequestDTO;
import com.gigforce.invoice.dto.PaymentResponseDTO;
import com.gigforce.invoice.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payment Management", description = "Endpoints for processing, failing, and tracking contractor payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Create a new Payment with required fields only (invoiceId, paidAmount, paymentDate, paymentMode)")
    public ResponseEntity<PaymentResponseDTO> createPayment(@Valid @RequestBody PaymentCreateRequestDTO request) {
        PaymentResponseDTO response = paymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Get Payment details by ID")
    public ResponseEntity<PaymentResponseDTO> getPaymentById(@PathVariable String id) {
        PaymentResponseDTO response = paymentService.getPaymentById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Get all Payments")
    public ResponseEntity<List<PaymentResponseDTO>> getAllPayments() {
        List<PaymentResponseDTO> response = paymentService.getAllPayments();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Update an existing Payment (only PENDING payments can be updated)")
    public ResponseEntity<PaymentResponseDTO> updatePayment(
            @PathVariable String id,
            @Valid @RequestBody PaymentUpdateRequestDTO request) {
        PaymentResponseDTO response = paymentService.updatePayment(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/process")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Process/Succeed a Payment")
    public ResponseEntity<PaymentResponseDTO> processPayment(@PathVariable String id) {
        PaymentResponseDTO response = paymentService.processPayment(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/fail")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Fail a Payment")
    public ResponseEntity<PaymentResponseDTO> failPayment(@PathVariable String id) {
        PaymentResponseDTO response = paymentService.failPayment(id);
        return ResponseEntity.ok(response);
    }
}



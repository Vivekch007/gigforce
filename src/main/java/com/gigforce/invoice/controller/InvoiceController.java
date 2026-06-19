package com.gigforce.invoice.controller;

import com.gigforce.invoice.dto.ContractorInvoiceRequestDTO;
import com.gigforce.invoice.dto.ContractorInvoiceResponseDTO;
import com.gigforce.invoice.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/invoices")
@Tag(name = "Contractor Invoice Management", description = "Endpoints for submitting, approving, rejecting, and tracking contractor invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Submit a new Contractor Invoice")
    public ResponseEntity<ContractorInvoiceResponseDTO> createInvoice(@Valid @RequestBody ContractorInvoiceRequestDTO request) {
        ContractorInvoiceResponseDTO response = invoiceService.createInvoice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER', 'CONTRACTOR')")
    @Operation(summary = "Get Contractor Invoice by ID")
    public ResponseEntity<ContractorInvoiceResponseDTO> getInvoiceById(@PathVariable String id) {
        ContractorInvoiceResponseDTO response = invoiceService.getInvoiceById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER', 'CONTRACTOR')")
    @Operation(summary = "Get all Contractor Invoices")
    public ResponseEntity<List<ContractorInvoiceResponseDTO>> getAllInvoices() {
        List<ContractorInvoiceResponseDTO> response = invoiceService.getAllInvoices();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Approve a Contractor Invoice")
    public ResponseEntity<ContractorInvoiceResponseDTO> approveInvoice(@PathVariable String id) {
        ContractorInvoiceResponseDTO response = invoiceService.approveInvoice(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Reject a Contractor Invoice")
    public ResponseEntity<ContractorInvoiceResponseDTO> rejectInvoice(@PathVariable String id) {
        ContractorInvoiceResponseDTO response = invoiceService.rejectInvoice(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/dispute")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Dispute a Contractor Invoice")
    public ResponseEntity<ContractorInvoiceResponseDTO> disputeInvoice(@PathVariable String id) {
        ContractorInvoiceResponseDTO response = invoiceService.disputeInvoice(id);
        return ResponseEntity.ok(response);
    }
}

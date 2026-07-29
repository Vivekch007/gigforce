package com.gigforce.assignment.controller;

import com.gigforce.assignment.dto.AmendmentRequestDTO;
import com.gigforce.assignment.dto.AmendmentResponseDTO;
import com.gigforce.assignment.service.AssignmentAmendmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Assignment Amendment Management", description = "Endpoints for submitting, approving, rejecting, and listing assignment amendments")
public class AssignmentAmendmentController {

    private final AssignmentAmendmentService amendmentService;

    public AssignmentAmendmentController(AssignmentAmendmentService amendmentService) {
        this.amendmentService = amendmentService;
    }

    @PostMapping("/assignments/{assignId}/amendments")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR_MANAGER', 'VENDOR')")
    @Operation(summary = "Submit a contract amendment request (assigned vendor or admin)")
    public ResponseEntity<AmendmentResponseDTO> createAmendment(
            @PathVariable String assignId,
            @Valid @RequestBody AmendmentRequestDTO request) {
        AmendmentResponseDTO response = amendmentService.createAmendment(assignId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/amendments/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Approve a pending amendment request")
    public ResponseEntity<AmendmentResponseDTO> approveAmendment(
            @PathVariable String id,
            @RequestParam(required = false) String remarks) {
        AmendmentResponseDTO response = amendmentService.approveAmendment(id, remarks);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/amendments/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Reject a pending amendment request")
    public ResponseEntity<AmendmentResponseDTO> rejectAmendment(
            @PathVariable String id,
            @RequestParam(required = false) String remarks) {
        AmendmentResponseDTO response = amendmentService.rejectAmendment(id, remarks);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assignments/{assignId}/amendments")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR', 'FINANCE')")
    @Operation(summary = "Get all amendments for a specific assignment")
    public ResponseEntity<List<AmendmentResponseDTO>> getAmendmentsByAssignmentId(@PathVariable String assignId) {
        List<AmendmentResponseDTO> response = amendmentService.getAmendmentsByAssignmentId(assignId);
        return ResponseEntity.ok(response);
    }
}

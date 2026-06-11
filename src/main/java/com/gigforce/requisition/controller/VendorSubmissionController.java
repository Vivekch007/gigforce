package com.gigforce.requisition.controller;

import com.gigforce.requisition.dto.VendorSubmissionRequestDTO;
import com.gigforce.requisition.dto.VendorSubmissionResponseDTO;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.service.VendorSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/submissions")
@Tag(name = "Vendor Submission Management", description = "Endpoints for submitting contractor profiles, reviewing, accepting, rejecting, and searching vendor submissions")
public class VendorSubmissionController {

    private final VendorSubmissionService submissionService;

    public VendorSubmissionController(VendorSubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping("/requisitions/{reqId}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Submit a contractor profile to an open requisition")
    public ResponseEntity<VendorSubmissionResponseDTO> submitContractor(
            @PathVariable String reqId,
            @Valid @RequestBody VendorSubmissionRequestDTO request) {
        VendorSubmissionResponseDTO response = submissionService.submitContractor(reqId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/requisitions/{reqId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Get all submissions for a specific requisition (filtered by user access)")
    public ResponseEntity<List<VendorSubmissionResponseDTO>> getSubmissionsByRequisitionId(@PathVariable String reqId) {
        List<VendorSubmissionResponseDTO> response = submissionService.getSubmissionsByRequisitionId(reqId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get submission details by ID")
    public ResponseEntity<VendorSubmissionResponseDTO> getSubmissionById(@PathVariable String id) {
        VendorSubmissionResponseDTO response = submissionService.getSubmissionById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Transition submission status to REVIEWING")
    public ResponseEntity<VendorSubmissionResponseDTO> transitionToReviewing(@PathVariable String id) {
        VendorSubmissionResponseDTO response = submissionService.transitionStatus(id, SubmissionStatus.REVIEWING, null);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Transition submission status to ACCEPTED")
    public ResponseEntity<VendorSubmissionResponseDTO> transitionToAccepted(
            @PathVariable String id,
            @RequestParam(required = false) String remarks) {
        VendorSubmissionResponseDTO response = submissionService.transitionStatus(id, SubmissionStatus.ACCEPTED,
                remarks);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Transition submission status to REJECTED")
    public ResponseEntity<VendorSubmissionResponseDTO> transitionToRejected(
            @PathVariable String id,
            @RequestParam(required = false) String remarks) {
        VendorSubmissionResponseDTO response = submissionService.transitionStatus(id, SubmissionStatus.REJECTED,
                remarks);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Search and filter submissions (Paginated)")
    public ResponseEntity<Page<VendorSubmissionResponseDTO>> searchSubmissions(
            @RequestParam(required = false) String requisitionId,
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) String contractorProfileId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<VendorSubmissionResponseDTO> response = submissionService.searchSubmissions(
                requisitionId, status, contractorProfileId, page, size);
        return ResponseEntity.ok(response);
    }
}

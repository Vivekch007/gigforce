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
    @PreAuthorize("hasAnyRole('VENDOR_MANAGER', 'VENDOR')")
    @Operation(summary = "Submit a contractor profile to an open requisition")
    public ResponseEntity<VendorSubmissionResponseDTO> submitContractor(
            @PathVariable String reqId,
            @Valid @RequestBody VendorSubmissionRequestDTO request) {
        VendorSubmissionResponseDTO response = submissionService.submitContractor(reqId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/requisitions/{reqId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR')")
    @Operation(summary = "Get all submissions for a specific requisition (filtered by user access)")
    public ResponseEntity<List<VendorSubmissionResponseDTO>> getSubmissionsByRequisitionId(@PathVariable String reqId) {
        List<VendorSubmissionResponseDTO> response = submissionService.getSubmissionsByRequisitionId(reqId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR')")
    @Operation(summary = "Get submission details by ID")
    public ResponseEntity<VendorSubmissionResponseDTO> getSubmissionById(@PathVariable String id) {
        VendorSubmissionResponseDTO response = submissionService.getSubmissionById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/shortlist")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Transition submission status to SHORTLISTED")
    public ResponseEntity<VendorSubmissionResponseDTO> transitionToShortlisted(@PathVariable String id) {
        VendorSubmissionResponseDTO response = submissionService.transitionStatus(id, SubmissionStatus.SHORTLISTED, null);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/schedule-interview")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Transition submission status to INTERVIEW_SCHEDULED")
    public ResponseEntity<VendorSubmissionResponseDTO> transitionToInterviewScheduled(@PathVariable String id) {
        VendorSubmissionResponseDTO response = submissionService.transitionStatus(id, SubmissionStatus.INTERVIEW_SCHEDULED, null);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/select")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Transition submission status to SELECTED (HR/Admin only)")
    public ResponseEntity<VendorSubmissionResponseDTO> transitionToSelected(
            @PathVariable String id,
            @RequestParam(required = false) String remarks) {
        VendorSubmissionResponseDTO response = submissionService.transitionStatus(id, SubmissionStatus.SELECTED,
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
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR')")
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

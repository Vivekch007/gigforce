package com.gigforce.identity.controller;

import com.gigforce.assignment.dto.AbsenceRequestDTO;
import com.gigforce.assignment.dto.AbsenceResponseDTO;
import com.gigforce.identity.service.ContractorAbsenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/absences")
@Tag(name = "Leave & Absence Management", description = "Endpoints for contractors to request leave and managers to review/approve requests")
public class ContractorAbsenceController {

    private final ContractorAbsenceService absenceService;

    public ContractorAbsenceController(ContractorAbsenceService absenceService) {
        this.absenceService = absenceService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTRACTOR')")
    @Operation(summary = "Submit a leave absence request")
    public ResponseEntity<AbsenceResponseDTO> requestLeave(@Valid @RequestBody AbsenceRequestDTO request) {
        AbsenceResponseDTO response = absenceService.requestLeave(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Get leave request details by ID")
    public ResponseEntity<AbsenceResponseDTO> getLeaveById(@PathVariable String id) {
        AbsenceResponseDTO response = absenceService.getLeaveById(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Approve a pending leave request")
    public ResponseEntity<AbsenceResponseDTO> approveLeave(@PathVariable String id) {
        AbsenceResponseDTO response = absenceService.approveLeave(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Reject a pending leave request")
    public ResponseEntity<AbsenceResponseDTO> rejectLeave(
            @PathVariable String id,
            @RequestParam String remarks) {
        AbsenceResponseDTO response = absenceService.rejectLeave(id, remarks);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Search and filter contractor leaves")
    public ResponseEntity<List<AbsenceResponseDTO>> searchLeaves(
            @RequestParam(required = false) String contractorProfileId,
            @RequestParam(required = false) String assignmentId,
            @RequestParam(required = false) com.gigforce.assignment.enums.AbsenceStatus status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(required = false) String orgUnitId) {
        List<AbsenceResponseDTO> response = absenceService.searchLeaves(
                contractorProfileId, assignmentId, status, startDate, endDate, orgUnitId);
        return ResponseEntity.ok(response);
    }
}

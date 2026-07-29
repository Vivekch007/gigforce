package com.gigforce.assignment.controller;

import com.gigforce.assignment.dto.*;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.assignment.service.TimesheetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/timesheets")
@Tag(name = "Timesheet Management", description = "Endpoints for creating, managing, submitting, and approving weekly contractor timesheets")
public class TimesheetController {

    private final TimesheetService timesheetService;

    public TimesheetController(TimesheetService timesheetService) {
        this.timesheetService = timesheetService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('HIRING_MANAGER', 'VENDOR')")
//    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Create weekly timesheet draft (contractor only; backend pre-generates Mon-Fri lines)")
    public ResponseEntity<TimesheetResponseDTO> createTimesheet(@Valid @RequestBody com.gigforce.assignment.dto.TimesheetCreateRequestDTO request) {
        TimesheetResponseDTO response = timesheetService.createTimesheet(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN') || hasAnyRole('CONTRACTOR')")
    @Operation(summary = "Update weekly timesheet draft")
    public ResponseEntity<TimesheetResponseDTO> updateTimesheet(
            @PathVariable String id,
            @Valid @RequestBody TimesheetUpdateRequestDTO request) {
        TimesheetResponseDTO response = timesheetService.updateTimesheet(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTRACTOR')")
    @Operation(summary = "Submit weekly timesheet for HR review")
    public ResponseEntity<TimesheetResponseDTO> submitTimesheet(@PathVariable String id) {
        TimesheetResponseDTO response = timesheetService.submitTimesheet(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Approve timesheet hours (HR / Hiring Manager)")
    public ResponseEntity<TimesheetResponseDTO> approveTimesheet(
            @PathVariable String id,
            @RequestBody(required = false) TimesheetApprovalRequestDTO request) {
        TimesheetResponseDTO response = timesheetService.approveTimesheet(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Reject timesheet hours (HR / Hiring Manager)")
    public ResponseEntity<TimesheetResponseDTO> rejectTimesheet(
            @PathVariable String id,
            @RequestBody @Valid TimesheetApprovalRequestDTO request) {
        TimesheetResponseDTO response = timesheetService.rejectTimesheet(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Add comment to timesheet thread")
    public ResponseEntity<Void> addComment(
            @PathVariable String id,
            @RequestBody @Valid TimesheetCommentRequestDTO request) {
        timesheetService.addComment(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Get timesheet details by ID")
    public ResponseEntity<TimesheetResponseDTO> getTimesheetById(@PathVariable String id) {
        TimesheetResponseDTO response = timesheetService.getTimesheetById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR')")
    @Operation(summary = "Search and filter timesheets")
    public ResponseEntity<List<TimesheetResponseDTO>> searchTimesheets(
            @RequestParam(required = false) String timesheetId,
            @RequestParam(required = false) String contractorProfileId,
            @RequestParam(required = false) String assignmentId,
            @RequestParam(required = false) TimesheetStatus status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate weekStartDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate weekEndDate,
            @RequestParam(required = false) String orgUnitId) {
        List<TimesheetResponseDTO> response = timesheetService.searchTimesheets(
                timesheetId, contractorProfileId, assignmentId, status, weekStartDate, weekEndDate, orgUnitId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/payroll-ready")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER')")
    @Operation(summary = "Get APPROVED and NOT_PROCESSED timesheets for billing/payroll")
    public ResponseEntity<List<TimesheetResponseDTO>> getPayrollReadyTimesheets() {
        List<TimesheetResponseDTO> response = timesheetService.getPayrollReadyTimesheets();
        return ResponseEntity.ok(response);
    }
}

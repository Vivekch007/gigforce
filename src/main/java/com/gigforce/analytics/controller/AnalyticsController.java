package com.gigforce.analytics.controller;

import com.gigforce.analytics.dto.*;
import com.gigforce.analytics.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@Tag(name = "Workforce Analytics & Reporting", description = "Endpoints for generating reports and tracking analytical dashboards")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Generate a new Workforce Report snapshot")
    public ResponseEntity<WorkforceReportResponseDTO> generateReport(@Valid @RequestBody WorkforceReportRequestDTO request) {
        WorkforceReportResponseDTO response = analyticsService.generateReport(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Get all Workforce Report snapshots")
    public ResponseEntity<List<WorkforceReportResponseDTO>> getAllReports() {
        List<WorkforceReportResponseDTO> response = analyticsService.getAllReports();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Get a Workforce Report snapshot by ID")
    public ResponseEntity<WorkforceReportResponseDTO> getReportById(@PathVariable String id) {
        WorkforceReportResponseDTO response = analyticsService.getReportById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/executive-dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Get Executive Dashboard metrics")
    public ResponseEntity<ExecutiveDashboardResponseDTO> getExecutiveDashboard(
            @RequestParam(required = false, defaultValue = "30") Integer days) {
        ExecutiveDashboardResponseDTO response = analyticsService.getExecutiveDashboard(days);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/vendor-scorecard/{vendorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR_MANAGER', 'VENDOR')")
    @Operation(summary = "Get Vendor scorecard metrics")
    public ResponseEntity<VendorScorecardResponseDTO> getVendorScorecard(@PathVariable String vendorId) {
        VendorScorecardResponseDTO response = analyticsService.getVendorScorecard(vendorId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/business-unit/{businessUnit}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER')")
    @Operation(summary = "Get Business Unit metrics")
    public ResponseEntity<BusinessUnitDashboardResponseDTO> getBusinessUnitDashboard(@PathVariable String businessUnit) {
        BusinessUnitDashboardResponseDTO response = analyticsService.getBusinessUnitDashboard(businessUnit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/skill/{skill}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE', 'HIRING_MANAGER')")
    @Operation(summary = "Get Skill dashboard metrics")
    public ResponseEntity<SkillDashboardResponseDTO> getSkillDashboard(@PathVariable String skill) {
        SkillDashboardResponseDTO response = analyticsService.getSkillDashboard(skill);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/compliance-expiry")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR_MANAGER')")
    @Operation(summary = "Get compliance expiry counts")
    public ResponseEntity<Long> getComplianceExpiryCount(
            @RequestParam(required = false, defaultValue = "30") Integer days) {
        Long response = analyticsService.getComplianceExpiryCount(days);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/personal-dashboard")
    @PreAuthorize("hasRole('CONTRACTOR')")
    @Operation(summary = "Get Contractor Personal Dashboard metrics")
    public ResponseEntity<PersonalDashboardResponseDTO> getPersonalDashboard() {
        PersonalDashboardResponseDTO response = analyticsService.getPersonalDashboard();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    @Operation(summary = "Search/Filter workforce metrics dynamically")
    public ResponseEntity<ExecutiveDashboardResponseDTO> getFilteredReport(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(required = false) String orgUnitId,
            @RequestParam(required = false) String vendorId,
            @RequestParam(required = false) String contractorId,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String assignmentStatus,
            @RequestParam(required = false) String invoiceStatus,
            @RequestParam(required = false) String timesheetStatus) {
        ExecutiveDashboardResponseDTO response = analyticsService.getFilteredReport(
                startDate, endDate, orgUnitId, vendorId, contractorId, skill, assignmentStatus, invoiceStatus, timesheetStatus);
        return ResponseEntity.ok(response);
    }
}

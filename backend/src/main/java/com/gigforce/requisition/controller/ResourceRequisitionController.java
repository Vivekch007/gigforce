package com.gigforce.requisition.controller;

import com.gigforce.requisition.dto.ResourceRequisitionRequestDTO;
import com.gigforce.requisition.dto.ResourceRequisitionResponseDTO;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.service.ResourceRequisitionService;
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

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/requisitions")
@Tag(name = "Resource Requisition Management", description = "Endpoints for creating, updating, publishing, cancelling, and searching resource requisitions")
public class ResourceRequisitionController {

    private final ResourceRequisitionService requisitionService;

    public ResourceRequisitionController(ResourceRequisitionService requisitionService) {
        this.requisitionService = requisitionService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Create a new resource requisition (defaults to DRAFT)")
    public ResponseEntity<ResourceRequisitionResponseDTO> createRequisition(
            @Valid @RequestBody ResourceRequisitionRequestDTO request) {
        ResourceRequisitionResponseDTO response = requisitionService.createRequisition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Update an existing requisition (only allowed in DRAFT status)")
    public ResponseEntity<ResourceRequisitionResponseDTO> updateRequisition(
            @PathVariable String id,
            @Valid @RequestBody ResourceRequisitionRequestDTO request) {
        ResourceRequisitionResponseDTO response = requisitionService.updateRequisition(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Publish a draft requisition (DRAFT -> OPEN)")
    public ResponseEntity<ResourceRequisitionResponseDTO> publishRequisition(@PathVariable String id) {
        ResourceRequisitionResponseDTO response = requisitionService.publishRequisition(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Cancel a requisition (DRAFT/OPEN -> CANCELLED)")
    public ResponseEntity<ResourceRequisitionResponseDTO> cancelRequisition(@PathVariable String id) {
        ResourceRequisitionResponseDTO response = requisitionService.cancelRequisition(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Close a requisition")
    public ResponseEntity<ResourceRequisitionResponseDTO> closeRequisition(@PathVariable String id) {
        ResourceRequisitionResponseDTO response = requisitionService.closeRequisition(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/under-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Put a requisition under review")
    public ResponseEntity<ResourceRequisitionResponseDTO> underReviewRequisition(@PathVariable String id) {
        ResourceRequisitionResponseDTO response = requisitionService.underReviewRequisition(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR', 'FINANCE')")
    @Operation(summary = "Get list of department options from BusinessUnits enum")
    public ResponseEntity<com.gigforce.requisition.enums.BusinessUnits[]> getDepartments() {
        return ResponseEntity.ok(com.gigforce.requisition.enums.BusinessUnits.values());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR', 'FINANCE')")
    @Operation(summary = "Get requisition details by ID")
    public ResponseEntity<ResourceRequisitionResponseDTO> getRequisitionById(@PathVariable String id) {
        ResourceRequisitionResponseDTO response = requisitionService.getRequisitionById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR', 'FINANCE')")
    @Operation(summary = "Search and filter requisitions (Paginated)")
    public ResponseEntity<Page<ResourceRequisitionResponseDTO>> searchRequisitions(
            @RequestParam(required = false) String requisitionId,
            @RequestParam(required = false) String jobTitle,
            @RequestParam(required = false) RequisitionStatus status,
            @RequestParam(required = false) String requiredSkillId,
            @RequestParam(required = false) String hiringManager,
            @RequestParam(required = false) String orgUnitId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ResourceRequisitionResponseDTO> response = requisitionService.searchRequisitions(
                requisitionId, jobTitle, status, requiredSkillId, hiringManager, orgUnitId, page, size);
        return ResponseEntity.ok(response);
    }
}

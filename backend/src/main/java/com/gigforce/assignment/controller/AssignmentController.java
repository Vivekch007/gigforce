package com.gigforce.assignment.controller;

import com.gigforce.assignment.dto.AssignmentRequestDTO;
import com.gigforce.assignment.dto.AssignmentResponseDTO;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.service.AssignmentService;
import com.gigforce.common.util.ApplicationContextHolder;
import com.gigforce.security.CurrentUserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assignments")
@Tag(name = "Assignment & Contract Management", description = "Endpoints for creating, retrieving, and searching assignments/contracts")
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final CurrentUserContext currentUserContext;

    public AssignmentController(AssignmentService assignmentService, CurrentUserContext currentUserContext) {
        this.assignmentService = assignmentService;
        this.currentUserContext = currentUserContext;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Create an assignment from an accepted vendor submission")
    public ResponseEntity<AssignmentResponseDTO> createAssignment(@Valid @RequestBody AssignmentRequestDTO request) {
        AssignmentResponseDTO response = assignmentService.createAssignment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR', 'FINANCE')")
    @Operation(summary = "Get assignment details by ID")
    public ResponseEntity<AssignmentResponseDTO> getAssignmentById(@PathVariable String id) {
        AssignmentResponseDTO response = assignmentService.getAssignmentById(id);
        return ResponseEntity.ok(response);
    }



    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Cancel an assignment (CREATED -> CANCELLED)")
    public ResponseEntity<AssignmentResponseDTO> cancelAssignment(@PathVariable String id) {
        AssignmentResponseDTO response = assignmentService.cancelAssignment(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")
    @Operation(summary = "Complete an assignment (ACTIVE/EXTENDED -> COMPLETED)")
    public ResponseEntity<AssignmentResponseDTO> completeAssignment(@PathVariable String id) {
        AssignmentResponseDTO response = assignmentService.completeAssignment(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'FINANCE', 'CONTRACTOR')")
    @Operation(summary = "Search and filter assignments (Paginated)")
    public ResponseEntity<Page<AssignmentResponseDTO>> searchAssignments(
            @RequestParam(required = false) String assignmentId,
            @RequestParam(required = false) String contractorProfileId,
            @RequestParam(required = false) String requisitionId,
            @RequestParam(required = false) String vendorId,
            @RequestParam(required = false) AssignmentStatus status,
            @RequestParam(required = false) String orgUnitId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<AssignmentResponseDTO> response = assignmentService.searchAssignments(
                assignmentId, contractorProfileId, requisitionId, vendorId, status, orgUnitId, page, size);
        return ResponseEntity.ok(response);
    }
}

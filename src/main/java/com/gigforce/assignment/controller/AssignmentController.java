package com.gigforce.assignment.controller;

import com.gigforce.assignment.dto.AssignmentRequestDTO;
import com.gigforce.assignment.dto.AssignmentResponseDTO;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.service.AssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assignments")
@Tag(name = "Assignment & Contract Management", description = "Endpoints for creating, retrieving, and searching assignments/contracts")
public class AssignmentController {

    private final AssignmentService assignmentService;

    public AssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
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

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR', 'FINANCE')")
    @Operation(summary = "Search and filter assignments (Paginated)")
    public ResponseEntity<Page<AssignmentResponseDTO>> searchAssignments(
            @RequestParam(required = false) AssignmentStatus status,
            @RequestParam(required = false) String contractorProfileId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<AssignmentResponseDTO> response = assignmentService.searchAssignments(status, contractorProfileId, page,
                size);
        return ResponseEntity.ok(response);
    }
}

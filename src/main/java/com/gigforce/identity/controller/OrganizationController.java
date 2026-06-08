package com.gigforce.identity.controller;

import com.gigforce.identity.dto.OrganizationRequestDTO;
import com.gigforce.identity.dto.OrganizationResponseDTO;
import com.gigforce.identity.dto.OrganizationUpdateRequestDTO;
import com.gigforce.identity.entity.Organization;
import com.gigforce.identity.mapper.UserMapper;
import com.gigforce.identity.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/organizations")
@Tag(name = "Organization Management", description = "Endpoints for creating, updating, and retrieving organizations")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final UserMapper userMapper;

    public OrganizationController(OrganizationService organizationService, UserMapper userMapper) {
        this.organizationService = organizationService;
        this.userMapper = userMapper;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create organization unit", description = "Creates a new organization unit. Restricted to ADMIN users.")
    public ResponseEntity<OrganizationResponseDTO> createOrganization(
            @Valid @RequestBody OrganizationRequestDTO request
    ) {
        Organization org = organizationService.createOrganization(request.getName(), request.getCode(), request.getStatus());
        return ResponseEntity.status(HttpStatus.CREATED).body(userMapper.toOrganizationDto(org));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update organization unit details", description = "Updates organization unit name and status. Restricted to ADMIN users.")
    public ResponseEntity<OrganizationResponseDTO> updateOrganization(
            @PathVariable Long id,
            @Valid @RequestBody OrganizationUpdateRequestDTO request
    ) {
        Organization org = organizationService.updateOrganization(id, request.getName(), request.getStatus());
        return ResponseEntity.ok(userMapper.toOrganizationDto(org));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get organization by ID", description = "Retrieves details of an organization by ID. Requires authentication.")
    public ResponseEntity<OrganizationResponseDTO> getOrganizationById(@PathVariable Long id) {
        Organization org = organizationService.getById(id);
        return ResponseEntity.ok(userMapper.toOrganizationDto(org));
    }

    @GetMapping
    @Operation(summary = "Get all organizations", description = "Retrieves a list of all organizations. Requires authentication.")
    public ResponseEntity<List<OrganizationResponseDTO>> getAllOrganizations() {
        List<OrganizationResponseDTO> orgs = organizationService.getAll()
                .stream()
                .map(userMapper::toOrganizationDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(orgs);
    }
}

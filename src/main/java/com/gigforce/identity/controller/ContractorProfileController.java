package com.gigforce.identity.controller;

import com.gigforce.identity.dto.*;
import com.gigforce.identity.service.ContractorCertificationService;
import com.gigforce.identity.service.ContractorProfileService;
import com.gigforce.identity.service.EngagementHistoryService;
import com.gigforce.security.CurrentUserContext;
import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contractors/profiles")
@Tag(name = "Contractor Profile Management", description = "Endpoints for creating and managing contractor profiles and skill maps")
public class  ContractorProfileController {

    private final ContractorProfileService contractorProfileService;
    private final CurrentUserContext currentUserContext;
    private final ContractorCertificationService contractorCertificationService;
    private final EngagementHistoryService engagementHistoryService;

    public ContractorProfileController(
            ContractorProfileService contractorProfileService,
            CurrentUserContext currentUserContext,
            ContractorCertificationService contractorCertificationService,
            EngagementHistoryService engagementHistoryService) {
        this.contractorProfileService = contractorProfileService;
        this.currentUserContext = currentUserContext;
        this.contractorCertificationService = contractorCertificationService;
        this.engagementHistoryService = engagementHistoryService;
    }

//    @PostMapping
//    @PreAuthorize("hasAnyRole('CONTRACTOR')")
//    @Operation(summary = "Create profile for a contractor user", description = "Registers a profile for the contractor user specified by userId. Restricted to CONTRACTOR USER ONLY.")
//    public ResponseEntity<ContractorProfileResponseDTO> createProfile(
//            @Valid @RequestBody ContractorProfileCreationRequestDTO request) {
//        if (request.getUserId() == null) {
//            throw new IllegalArgumentException("User ID is required to create a contractor profile.");
//        }
//        ContractorProfileResponseDTO profile = contractorProfileService.createProfile(request.getUserId(), request);
//        return ResponseEntity.status(HttpStatus.CREATED).body(profile);
//    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CONTRACTOR')")
    @Operation(summary = "Get current contractor's profile", description = "Retrieves profile details of the authenticated caller.")
    public ResponseEntity<ContractorProfileResponseDTO> getMyProfile() {
        String userId = currentUserContext.getCurrentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileByUserId(userId);
        return ResponseEntity.ok(profile);
    }


    @GetMapping("/{id}")
    @Operation(summary = "Get contractor profile by ID", description = "Retrieves profile details by ID. Subject to owner or tenant isolation checks.")
    public ResponseEntity<ContractorProfileResponseDTO> getProfileById(@PathVariable String id) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateAccess(profile);
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update contractor profile", description = "Updates profile info and status. Restricted to profile owner or ADMIN.")
    public ResponseEntity<ContractorProfileResponseDTO> updateProfile(
            @PathVariable String id,
            @Valid @RequestBody ContractorProfileUpdateRequestDTO request) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateOwnerOrAdmin(profile);
        ContractorProfileResponseDTO updated = contractorProfileService.updateProfile(id, request);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR', 'VENDOR_MANAGER')")
    @Operation(summary = "Change contractor profile status", description = "Sets ACTIVE/INACTIVE/BLACKLISTED. Restricted to HR, Vendor, and ADMIN.")
    public ResponseEntity<ContractorProfileResponseDTO> updateProfileStatus(
            @PathVariable String id,
            @Valid @RequestBody ContractorProfileStatusUpdateRequestDTO request) {
        ContractorProfileResponseDTO updated = contractorProfileService.updateProfileStatus(id, request.getStatus());
        return ResponseEntity.ok(updated);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'VENDOR_MANAGER', 'VENDOR', 'FINANCE')")
    @Operation(summary = "Search contractor profiles", description = "Retrieves a paginated list of profiles.")
    public ResponseEntity<Page<ContractorProfileResponseDTO>> searchProfiles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String availability,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String certification,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String orgUnitId,
            @RequestParam(required = false) String preferredEngagementType) {
        Page<ContractorProfileResponseDTO> profiles = contractorProfileService.searchProfiles(
                page, size, skill, minExperience, status, availability, location, certification,
                name, email, phone, orgUnitId, preferredEngagementType);
        return ResponseEntity.ok(profiles);
    }

    @PostMapping("/{id}/skills")
    @Operation(summary = "Add skill to contractor profile", description = "Maps a skill to the profile. Restricted to profile owner or ADMIN.")
    public ResponseEntity<ContractorProfileResponseDTO> addSkill(
            @PathVariable String id,
            @Valid @RequestBody ContractorSkillRequestDTO request) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateOwnerOrAdmin(profile);
        ContractorProfileResponseDTO updated = contractorProfileService.addSkill(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(updated);
    }

    @PutMapping("/{id}/skills/{skillId}")
    @Operation(summary = "Update contractor skill association", description = "Adjusts proficiency and experience of an associated skill. Restricted to owner or ADMIN.")
    public ResponseEntity<ContractorProfileResponseDTO> updateSkill(
            @PathVariable String id,
            @PathVariable String skillId,
            @Valid @RequestBody ContractorSkillUpdateRequestDTO request) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateOwnerOrAdmin(profile);
        ContractorProfileResponseDTO updated = contractorProfileService.updateSkill(id, skillId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/skills/{skillId}")
    @Operation(summary = "Remove skill from contractor profile", description = "Deletes skill association. Restricted to owner or ADMIN.")
    public ResponseEntity<Void> removeSkill(@PathVariable String id, @PathVariable String skillId) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateOwnerOrAdmin(profile);
        contractorProfileService.removeSkill(id, skillId);
        return ResponseEntity.noContent().build();
    }

    // --- Certifications Endpoints ---

    @PostMapping("/{id}/certifications")
    @Operation(summary = "Add certification to contractor profile", description = "Restricted to profile owner or ADMIN.")
    public ResponseEntity<ContractorCertificationResponseDTO> addCertification(
            @PathVariable String id,
            @Valid @RequestBody ContractorCertificationRequestDTO request) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateOwnerOrAdmin(profile);
        ContractorCertificationResponseDTO cert = contractorCertificationService.addCertification(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(cert);
    }

    @GetMapping("/{id}/certifications")
    @Operation(summary = "Get contractor certifications", description = "Retrieves all certifications mapped to a profile. Subject to tenant isolation.")
    public ResponseEntity<List<ContractorCertificationResponseDTO>> getCertifications(@PathVariable String id) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateAccess(profile);
        List<ContractorCertificationResponseDTO> certs = contractorCertificationService
                .getCertificationsByProfileId(id);
        return ResponseEntity.ok(certs);
    }

    @PutMapping("/{id}/certifications/{certId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update contractor certification", description = "Restricted to ADMIN.")
    public ResponseEntity<ContractorCertificationResponseDTO> updateCertification(
            @PathVariable String id,
            @PathVariable String certId,
            @Valid @RequestBody ContractorCertificationUpdateRequestDTO request) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);

        ContractorCertificationResponseDTO updated = contractorCertificationService.updateCertification(id, certId,
                request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/certifications/{certId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Remove certification from contractor profile", description = "Restricted to ADMIN.")
    public ResponseEntity<Void> removeCertification(@PathVariable String id, @PathVariable String certId) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);

        contractorCertificationService.deleteCertification(id, certId);
        return ResponseEntity.noContent().build();
    }

    // --- Engagement History Endpoints ---

    @PostMapping("/{id}/engagements")
    @PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER', 'CONTRACTOR')")
    @Operation(summary = "Add engagement to contractor profile", description = "The owning contractor can add their own engagement history; ADMIN, CONTRACTOR and HIRING_MANAGER can add for any profile.")
    public ResponseEntity<EngagementHistoryResponseDTO> addEngagement(
            @PathVariable String id,
            @Valid @RequestBody EngagementHistoryRequestDTO request) {
        ContractorProfileResponseDTO profile = contractorProfileService.getProfileById(id);
        validateOwnerOrManager(profile);

        EngagementHistoryResponseDTO eng = engagementHistoryService.addEngagement(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(eng);
    }

    @GetMapping("/{id}/engagements")
    @Operation(summary = "Get contractor engagement history", description = "Retrieves all engagements mapped to a profile.")
    public ResponseEntity<List<EngagementHistoryResponseDTO>> getEngagements(@PathVariable String id) {

        List<EngagementHistoryResponseDTO> engs = engagementHistoryService.getEngagementsByProfileId(id);
        return ResponseEntity.ok(engs);
    }

    @PutMapping("/{id}/engagements/{engagementId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR_MANAGER', 'VENDOR')")
    @Operation(summary = "Approve contractor engagement", description = "Restricted to ADMIN, VENDOR_MANAGER, or VENDOR.")
    public ResponseEntity<EngagementHistoryResponseDTO> ApproveEngagement(@PathVariable String id, @PathVariable String engagementId) {
        EngagementHistoryResponseDTO updated = engagementHistoryService.approveEngagement(id, engagementId);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/engagements/{engagementId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTRACTOR')")
    @Operation(summary = "Update contractor engagement", description = "Restricted to ADMIN or CONTRACTOR.")
    public ResponseEntity<EngagementHistoryResponseDTO> updateEngagement(
            @PathVariable String id,
            @PathVariable String engagementId,
            @Valid @RequestBody EngagementHistoryUpdateRequestDTO request) {
        contractorProfileService.getProfileById(id);

        EngagementHistoryResponseDTO updated = engagementHistoryService.updateEngagement(id, engagementId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}/engagements/{engagementId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTRACTOR')")
    @Operation(summary = "Remove engagement from contractor profile", description = "Restricted to ADMIN or CONTRACTOR.")
    public ResponseEntity<Void> removeEngagement(@PathVariable String id, @PathVariable String engagementId) {
        contractorProfileService.getProfileById(id);
        engagementHistoryService.deleteEngagement(id, engagementId);
        return ResponseEntity.noContent().build();
    }

    private void validateOwnerOrAdmin(ContractorProfileResponseDTO profile) {
        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) {
            return;
        }
        String currentUserId = currentUserContext.getCurrentUserId();
        if (currentUserId == null || !currentUserId.equals(profile.getUserId())) {
            throw new AccessDeniedException("Access Denied: You do not have permission to modify this profile.");
        }
    }

    private void validateOwnerOrManager(ContractorProfileResponseDTO profile) {
        String currentRole = currentUserContext.getCurrentUserRole();
        if ("ADMIN".equals(currentRole) || "HIRING_MANAGER".equals(currentRole)) {
            return;
        }
        String currentUserId = currentUserContext.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(profile.getUserId())) {
            return; // the owning contractor
        }
        throw new AccessDeniedException("Access Denied: You are not permitted to modify engagements for this profile.");
    }

    private void validateAccess(ContractorProfileResponseDTO profile) {
        String currentUserId = currentUserContext.getCurrentUserId();
        String currentRole = currentUserContext.getCurrentUserRole();
        String currentOrgUnitId = currentUserContext.getCurrentUserOrgUnitId();

        if (currentUserId == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        // Admin and Finance bypass checks
        if (currentRole.equals("ADMIN") || currentRole.equals("FINANCE")) {
            return;
        }

        // Contractor can only view their own profile
        if (currentRole.equals("CONTRACTOR")) {
            if (!currentUserId.equals(profile.getUserId())) {
                throw new AccessDeniedException("Access Denied: Contractors can only view their own profile.");
            }
            return;
        }

        // Hiring Manager can only view contractors in their own organization
        if (currentRole.equals("HIRING_MANAGER")) {
            if (currentOrgUnitId == null || !currentOrgUnitId.equals(profile.getOrgUnitId())) {
                throw new AccessDeniedException("Access Denied: Hiring Managers can only view contractors in their own organization.");
            }
            return;
        }

        // Vendor / Vendor Manager can only view contractors belonging to their vendor
        if (currentRole.equals("VENDOR") || currentRole.equals("VENDOR_MANAGER")) {
            if (currentOrgUnitId == null || !currentOrgUnitId.equals(profile.getOrgUnitId())) {
                throw new AccessDeniedException("Access Denied: Vendor Managers can only view contractors belonging to their vendor.");
            }
            return;
        }

        throw new AccessDeniedException("Access Denied: You do not have permission to view this contractor profile.");
    }
}

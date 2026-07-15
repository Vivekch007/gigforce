package com.gigforce.identity.controller;

import com.gigforce.identity.dto.UserResponseDTO;
import com.gigforce.identity.dto.UserUpdateRequestDTO;
import com.gigforce.identity.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "Endpoints for managing users, updating profile details, and controlling account statuses")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') || hasRole('HIRING_MANAGER')")
    @Operation(summary = "Get all users (Paginated & Filtered)", description = "Retrieves a paginated list of users. Restricted to ADMIN users and Hiring Manager.")
    public ResponseEntity<Page<UserResponseDTO>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        Page<UserResponseDTO> users = userService.getAllUsers(page, size, role, status);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Retrieves profile details of the authenticated caller.")
    public ResponseEntity<UserResponseDTO> getCurrentUserProfile() {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        UserResponseDTO user = userService.getUserByEmail(currentUsername);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') || hasRole('HIRING_MANAGER')")
    @Operation(summary = "Get user by ID", description = "Admins and Hiring Manager can view any user profile. Other roles restricted to viewing self profile only.")
    public ResponseEntity<UserResponseDTO> getUserById(@PathVariable String id) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        UserResponseDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}")

    @Operation(summary = "Update user details", description = "Updates name and/or phone. Admins can update any user, other roles restricted to updating self.")
    public ResponseEntity<UserResponseDTO> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UserUpdateRequestDTO request) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        UserResponseDTO user = userService.getUserById(id);

        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));


        if (!isAdmin && !user.getEmail().equals(currentUsername)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to update this user.");
        }

        UserResponseDTO updatedUser = userService.updateUser(id, request.getName(), request.getPhone());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}/suspend")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Suspend user account", description = "Restricted to ADMIN users.")
    public ResponseEntity<UserResponseDTO> suspendUser(@PathVariable String id) {
        UserResponseDTO suspendedUser = userService.suspendUser(id);
        return ResponseEntity.ok(suspendedUser);
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate user account", description = "Restricted to ADMIN users.")
    public ResponseEntity<UserResponseDTO> deactivateUser(@PathVariable String id) {
        UserResponseDTO deactivatedUser = userService.deactivateUser(id);
        return ResponseEntity.ok(deactivatedUser);
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate user account", description = "Activates a suspended/inactive user. Restricted to ADMIN users.")
    public ResponseEntity<UserResponseDTO> activateUser(@PathVariable String id) {
        UserResponseDTO activatedUser = userService.activateUser(id);
        return ResponseEntity.ok(activatedUser);
    }
}

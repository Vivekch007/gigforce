package com.gigforce.identity.controller;

import com.gigforce.identity.dto.LoginRequestDTO;
import com.gigforce.identity.dto.LoginResponseDTO;
import com.gigforce.identity.dto.RegisterRequestDTO;
import com.gigforce.identity.dto.TokenRefreshRequestDTO;
import com.gigforce.identity.dto.UserResponseDTO;
import com.gigforce.identity.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Endpoints for User registration, login, and token refresh")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Registers a new user (Contractor, Vendor, Finance, Admin etc.).")
    public ResponseEntity<UserResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        UserResponseDTO registeredUser = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(registeredUser);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Validates credentials and returns a JWT access token along with a refresh token.")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        LoginResponseDTO response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Refreshes an expired JWT access token using a valid refresh token.")
    public ResponseEntity<LoginResponseDTO> refresh(@Valid @RequestBody TokenRefreshRequestDTO request) {
        LoginResponseDTO response = authService.refresh(request);
        return ResponseEntity.ok(response);
    }
}

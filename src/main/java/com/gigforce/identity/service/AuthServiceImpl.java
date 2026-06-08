package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.DuplicateEmailException;
import com.gigforce.exception.InvalidCredentialsException;
import com.gigforce.exception.OrganizationNotFoundException;
import com.gigforce.identity.dto.LoginRequestDTO;
import com.gigforce.identity.dto.LoginResponseDTO;
import com.gigforce.identity.dto.RegisterRequestDTO;
import com.gigforce.identity.dto.TokenRefreshRequestDTO;
import com.gigforce.identity.dto.UserResponseDTO;
import com.gigforce.identity.entity.Organization;
import com.gigforce.identity.entity.RefreshToken;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.mapper.UserMapper;
import com.gigforce.identity.repository.OrganizationRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserDetailsService userDetailsService;
    private final UserMapper userMapper;
    private final AuditService auditService;

    public AuthServiceImpl(
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            UserDetailsService userDetailsService,
            UserMapper userMapper,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userDetailsService = userDetailsService;
        this.userMapper = userMapper;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public UserResponseDTO register(RegisterRequestDTO request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email address already registered: " + request.getEmail());
        }

        // Resolve Organization
        Organization org;
        if (request.getOrgCode() != null && !request.getOrgCode().trim().isEmpty()) {
            org = organizationRepository.findByCode(request.getOrgCode())
                    .orElseThrow(() -> new OrganizationNotFoundException("Organization not found with code: " + request.getOrgCode()));
        } else {
            // Assign default org (seeded on startup)
            org = organizationRepository.findByCode("GF_DEFAULT")
                    .orElseThrow(() -> new OrganizationNotFoundException("Default organization not found. Database must be seeded first."));
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .orgUnit(org)
                .role(request.getRole())
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        // Audit Logging
        auditService.logAction(
                savedUser.getId(),
                "USER_REGISTRATION",
                "USER",
                savedUser.getId(),
                String.format("User %s registered successfully with role %s", savedUser.getEmail(), savedUser.getRole().name())
        );

        return userMapper.toUserDto(savedUser);
    }

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null) {
            auditService.logAction(
                    0L,
                    "LOGIN_FAILURE",
                    "USER",
                    0L,
                    "Failed login attempt: Email not registered: " + request.getEmail()
            );
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            auditService.logAction(
                    user.getId(),
                    "LOGIN_FAILURE",
                    "USER",
                    user.getId(),
                    "Failed login attempt: User status is " + user.getStatus().name()
            );
            throw new InvalidCredentialsException("Authentication failed: User account is " + user.getStatus().name());
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            auditService.logAction(
                    user.getId(),
                    "LOGIN_FAILURE",
                    "USER",
                    user.getId(),
                    "Failed login attempt: Invalid password for email: " + request.getEmail()
            );
            throw new InvalidCredentialsException("Invalid email or password");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        String accessToken = jwtService.generateToken(userDetails, user.getRole().name());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        // Audit Logging
        auditService.logAction(
                user.getId(),
                "USER_LOGIN",
                "USER",
                user.getId(),
                String.format("User %s logged in successfully", user.getEmail())
        );

        return LoginResponseDTO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public LoginResponseDTO refresh(TokenRefreshRequestDTO request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    if (user.getStatus() != UserStatus.ACTIVE) {
                        throw new InvalidCredentialsException("User account is " + user.getStatus().name());
                    }
                    UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
                    String accessToken = jwtService.generateToken(userDetails, user.getRole().name());
                    // Rotate refresh token
                    RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user.getId());

                    // Audit Logging
                    auditService.logAction(
                            user.getId(),
                            "REFRESH_TOKEN_GENERATED",
                            "USER",
                            user.getId(),
                            String.format("User %s rotated refresh token", user.getEmail())
                    );

                    return LoginResponseDTO.builder()
                            .accessToken(accessToken)
                            .refreshToken(newRefreshToken.getToken())
                            .email(user.getEmail())
                            .role(user.getRole().name())
                            .build();
                })
                .orElseThrow(() -> new InvalidCredentialsException("Refresh token is invalid or expired"));
    }
}

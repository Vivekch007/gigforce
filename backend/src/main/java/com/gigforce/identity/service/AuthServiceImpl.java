package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.DuplicateEmailException;
import com.gigforce.exception.InvalidCredentialsException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.dto.*;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.entity.PasswordResetToken;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.event.ContractorProfileCreationEvent;
import com.gigforce.identity.mapper.UserMapper;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.identity.repository.PasswordResetTokenRepository;
import com.gigforce.notification.service.EmailService;
import com.gigforce.security.JwtService;
import com.gigforce.notification.publisher.NotificationPublisher;
import jakarta.validation.constraints.Email;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import com.gigforce.notification.service.EmailService;
@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserMapper userMapper;
    private final AuditService auditService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ContractorProfileService contractorProfileService;
    private final NotificationPublisher notificationPublisher;
    private final org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

    public AuthServiceImpl(
            EmailService emailService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserDetailsService userDetailsService,
            UserMapper userMapper,
            AuditService auditService,
            ContractorProfileService contractorProfileService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            NotificationPublisher notificationPublisher,
            org.springframework.context.ApplicationEventPublisher applicationEventPublisher) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.contractorProfileService = contractorProfileService;
        this.userDetailsService = userDetailsService;
        this.userMapper = userMapper;
        this.auditService = auditService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.notificationPublisher = notificationPublisher;
        this.applicationEventPublisher = applicationEventPublisher;
    }

    @Override
    @Transactional
    public UserResponseDTO register(RegisterRequestDTO request) {
        if (request.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException(
                    "Registration of ADMIN accounts is not allowed through the public endpoint.");
        }

        // orgUnitId identifies the hiring organization, so it is required only for the org-bound
        // roles (HR and Finance). Contractors and vendors are not tied to an org unit. When
        // provided it is normalized (trim + upper-case) so equality checks are reliable.
        if ((request.getRole() == UserRole.HIRING_MANAGER || request.getRole() == UserRole.FINANCE || request.getRole() == UserRole.VENDOR || request.getRole()  == UserRole.HIRING_MANAGER)
                && (request.getOrgUnitId() == null || request.getOrgUnitId().isBlank())) {
            throw new IllegalArgumentException(
                    "orgUnitId is required for " + request.getRole().name() + " accounts.");
        }
        String normalizedOrgUnitId = (request.getOrgUnitId() == null || request.getOrgUnitId().isBlank())
                ? null
                : request.getOrgUnitId().trim().toUpperCase();

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("Email address already registered: " + request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .status(UserStatus.ACTIVE)
                .orgUnitId(normalizedOrgUnitId)
                .build();

        User savedUser = userRepository.save(user);

        // Audit Logging
        auditService.logAction(
                savedUser.getId(),
                "USER_REGISTRATION",
                "USER",
                savedUser.getId(),
                String.format("User %s registered successfully with role %s", savedUser.getEmail(),
                        savedUser.getRole().name()));

        // Notification alert
        notificationPublisher.publishUserRegistration(savedUser);
        if (request.getRole() == UserRole.CONTRACTOR) {
            // publish profile creation event after commit
            ContractorProfileCreationRequestDTO contractorProfileRequest = ContractorProfileCreationRequestDTO.builder()
                    .userId(savedUser.getId())
                    .displayName(savedUser.getName())
                    .phone(savedUser.getPhone())
                    .build();

            applicationEventPublisher.publishEvent(new ContractorProfileCreationEvent(this, savedUser.getId(), contractorProfileRequest));
        }

        return userMapper.toUserDto(savedUser);
    }

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null) {
            auditService.logAction(
                    "",
                    "LOGIN_FAILURE",
                    "USER",
                    "",
                    "Failed login attempt: Email not registered: " + request.getEmail());
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            auditService.logAction(
                    user.getId(),
                    "LOGIN_FAILURE",
                    "USER",
                    user.getId(),
                    "Failed login attempt: User status is " + user.getStatus().name());
            throw new InvalidCredentialsException("Authentication failed: User account is " + user.getStatus().name());
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (AuthenticationException e) {
            auditService.logAction(
                    user.getId(),
                    "LOGIN_FAILURE",
                    "USER",
                    user.getId(),
                    "Failed login attempt: Invalid password for email: " + request.getEmail());
            throw new InvalidCredentialsException("Invalid email or password");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        String accessToken = jwtService.generateToken(userDetails, user.getRole().name());

        // Audit Logging
        auditService.logAction(
                user.getId(),
                "USER_LOGIN",
                "USER",
                user.getId(),
                String.format("User %s logged in successfully", user.getEmail()));

        return LoginResponseDTO.builder()
                .accessToken(accessToken)
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequestDTO request) {
        // Do not reveal whether the email is registered (prevents user enumeration).
        // Silently return so the caller always gets the same 200 response.
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            return;
        }

        // Delete existing tokens for user to avoid redundancy
        passwordResetTokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString().replaceAll("[^a-zA-Z0-9]", "").substring(0, 7);
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .build();

        passwordResetTokenRepository.save(resetToken);

        System.out.println("==================================================");
        System.out.println("Password Reset Token generated: " + token + " for user " + user.getEmail());
        System.out.println("==================================================");

        emailService.sendPasswordResetEmail(user.getEmail(), token);
        auditService.logAction(
                user.getId(),
                "FORGOT_PASSWORD_REQUESTED",
                "USER",
                user.getId(),
                "Password reset requested for email: " + user.getEmail());
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequestDTO request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid password reset token."));

        if (resetToken.isExpired()) {
            passwordResetTokenRepository.delete(resetToken);
            throw new IllegalArgumentException("Password reset token has expired.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        passwordResetTokenRepository.delete(resetToken);

        auditService.logAction(
                user.getId(),
                "PASSWORD_RESET_SUCCESS",
                "USER",
                user.getId(),
                "Password reset successfully via token for email: " + user.getEmail());

        notificationPublisher.publishPasswordReset(user);
    }

    @Override
    @Transactional
    public void changePassword(String currentUsername, ChangePasswordRequestDTO request) {
        User user = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Incorrect old password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        auditService.logAction(
                user.getId(),
                "PASSWORD_CHANGED",
                "USER",
                user.getId(),
                "Password changed successfully for user " + user.getEmail());

        notificationPublisher.publishPasswordChanged(user);
    }

    @Override
    @Transactional
    public void logout(String currentUsername) {
        User user = userRepository.findByEmail(currentUsername).orElse(null);
        String userId = user != null ? user.getId() : "";
        auditService.logAction(
                userId,
                "USER_LOGOUT",
                "USER",
                userId,
                "User logged out successfully: " + currentUsername);
    }
}

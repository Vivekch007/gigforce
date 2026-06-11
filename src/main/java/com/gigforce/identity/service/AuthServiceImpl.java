package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.DuplicateEmailException;
import com.gigforce.exception.InvalidCredentialsException;
import com.gigforce.identity.dto.LoginRequestDTO;
import com.gigforce.identity.dto.LoginResponseDTO;
import com.gigforce.identity.dto.RegisterRequestDTO;
import com.gigforce.identity.dto.UserResponseDTO;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.mapper.UserMapper;
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
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserMapper userMapper;
    private final AuditService auditService;

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserDetailsService userDetailsService,
            UserMapper userMapper,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userMapper = userMapper;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public UserResponseDTO register(RegisterRequestDTO request) {
        if (request.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException(
                    "Registration of ADMIN accounts is not allowed through the public endpoint.");
        }

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

}

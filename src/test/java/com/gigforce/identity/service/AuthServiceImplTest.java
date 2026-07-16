package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.DuplicateEmailException;
import com.gigforce.exception.InvalidCredentialsException;
import com.gigforce.identity.dto.*;
import com.gigforce.identity.entity.PasswordResetToken;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.mapper.UserMapper;
import com.gigforce.identity.repository.PasswordResetTokenRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.publisher.NotificationPublisher;
import com.gigforce.notification.service.EmailService;
import com.gigforce.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 1 - Identity & Access Management: AuthService unit tests.
 * Covers registration rules, login (incl. failure auditing), password reset/change and logout.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private EmailService emailService;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;
    @Mock private UserDetailsService userDetailsService;
    @Mock private UserMapper userMapper;
    @Mock private AuditService auditService;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private NotificationPublisher notificationPublisher;

    @InjectMocks private AuthServiceImpl authService;

    private User user(String id, String email, UserRole role, UserStatus status) {
        User u = User.builder()
                .name("Test User")
                .email(email)
                .password("hashed")
                .phone("1234567890")
                .role(role)
                .status(status)
                .orgUnitId("ORG1")
                .build();
        u.setId(id);
        return u;
    }

    private RegisterRequestDTO registerRequest(UserRole role, String orgUnitId) {
        return RegisterRequestDTO.builder()
                .name("Test User")
                .email("new@gigforce.com")
                .password("Passw0rd!")
                .phone("1234567890")
                .role(role)
                .orgUnitId(orgUnitId)
                .build();
    }

    // ---------- register ----------

    @Test
    void register_contractor_succeeds_defaultsToActive_andNormalizesOrgUnitId() {
        RegisterRequestDTO req = registerRequest(UserRole.CONTRACTOR, "org1"); // lower-case on purpose
        when(userRepository.existsByEmail("new@gigforce.com")).thenReturn(false);
        when(passwordEncoder.encode("Passw0rd!")).thenReturn("hashed");
        User saved = user("u1", "new@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(userMapper.toUserDto(saved)).thenReturn(UserResponseDTO.builder().userId("u1").build());

        UserResponseDTO result = authService.register(req);

        assertEquals("u1", result.getUserId());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals(UserStatus.ACTIVE, captor.getValue().getStatus(), "new users must default to ACTIVE");
        assertEquals("hashed", captor.getValue().getPassword(), "password must be encoded");
        assertEquals("ORG1", captor.getValue().getOrgUnitId(), "orgUnitId must be normalized (trim + upper-case)");
        verify(auditService).logAction(eq("u1"), eq("USER_REGISTRATION"), eq("USER"), eq("u1"), anyString());
        verify(notificationPublisher).publishUserRegistration(saved);
    }

    @Test
    void register_contractor_withoutOrgUnitId_succeeds() {
        RegisterRequestDTO req = registerRequest(UserRole.CONTRACTOR, null);
        when(userRepository.existsByEmail("new@gigforce.com")).thenReturn(false);
        when(passwordEncoder.encode("Passw0rd!")).thenReturn("hashed");
        User saved = user("u1", "new@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(userMapper.toUserDto(saved)).thenReturn(UserResponseDTO.builder().userId("u1").build());

        assertEquals("u1", authService.register(req).getUserId());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertNull(captor.getValue().getOrgUnitId(), "contractors may register without an org unit");
    }

    @Test
    void register_admin_isRejected() {
        RegisterRequestDTO req = registerRequest(UserRole.ADMIN, "ORG1");
        assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_hiringManager_withoutOrgUnitId_isRejected() {
        RegisterRequestDTO req = registerRequest(UserRole.HIRING_MANAGER, null);
        assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_finance_withoutOrgUnitId_isRejected() {
        RegisterRequestDTO req = registerRequest(UserRole.FINANCE, "   "); // blank counts as missing
        assertThrows(IllegalArgumentException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_hiringManager_withOrgUnitId_succeeds() {
        RegisterRequestDTO req = registerRequest(UserRole.HIRING_MANAGER, "ORG1");
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        User saved = user("u2", "new@gigforce.com", UserRole.HIRING_MANAGER, UserStatus.ACTIVE);
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(userMapper.toUserDto(saved)).thenReturn(UserResponseDTO.builder().userId("u2").build());

        assertEquals("u2", authService.register(req).getUserId());
    }

    @Test
    void register_duplicateEmail_isRejected() {
        RegisterRequestDTO req = registerRequest(UserRole.CONTRACTOR, "ORG1");
        when(userRepository.existsByEmail("new@gigforce.com")).thenReturn(true);
        assertThrows(DuplicateEmailException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    // ---------- login ----------

    @Test
    void login_success_returnsTokenAndAudits() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));
        when(userDetailsService.loadUserByUsername("a@gigforce.com")).thenReturn(mock(UserDetails.class));
        when(jwtService.generateToken(any(), eq("CONTRACTOR"))).thenReturn("jwt-token");

        LoginResponseDTO res = authService.login(
                LoginRequestDTO.builder().email("a@gigforce.com").password("Passw0rd!").build());

        assertEquals("jwt-token", res.getAccessToken());
        assertEquals("a@gigforce.com", res.getEmail());
        assertEquals("CONTRACTOR", res.getRole());
        verify(auditService).logAction(eq("u1"), eq("USER_LOGIN"), eq("USER"), eq("u1"), anyString());
    }

    @Test
    void login_unknownEmail_failsAndAudits() {
        when(userRepository.findByEmail("missing@gigforce.com")).thenReturn(Optional.empty());
        assertThrows(InvalidCredentialsException.class, () -> authService.login(
                LoginRequestDTO.builder().email("missing@gigforce.com").password("x").build()));
        verify(auditService).logAction(anyString(), eq("LOGIN_FAILURE"), eq("USER"), anyString(), anyString());
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void login_inactiveAccount_failsBeforeAuthentication() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.SUSPENDED);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));
        assertThrows(InvalidCredentialsException.class, () -> authService.login(
                LoginRequestDTO.builder().email("a@gigforce.com").password("x").build()));
        verify(auditService).logAction(eq("u1"), eq("LOGIN_FAILURE"), eq("USER"), eq("u1"), anyString());
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void login_wrongPassword_failsAndAudits() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        assertThrows(InvalidCredentialsException.class, () -> authService.login(
                LoginRequestDTO.builder().email("a@gigforce.com").password("wrong").build()));
        verify(auditService).logAction(eq("u1"), eq("LOGIN_FAILURE"), eq("USER"), eq("u1"), anyString());
    }

    // ---------- forgotPassword ----------

    @Test
    void forgotPassword_existingUser_sendsEmailAndAudits() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));

        authService.forgotPassword(ForgotPasswordRequestDTO.builder().email("a@gigforce.com").build());

        verify(passwordResetTokenRepository).deleteByUser(u);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendPasswordResetEmail(eq("a@gigforce.com"), anyString());
        verify(auditService).logAction(eq("u1"), eq("FORGOT_PASSWORD_REQUESTED"), eq("USER"), eq("u1"), anyString());
    }

    @Test
    void forgotPassword_unknownEmail_isSilent_noEnumeration() {
        when(userRepository.findByEmail("missing@gigforce.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> authService.forgotPassword(
                ForgotPasswordRequestDTO.builder().email("missing@gigforce.com").build()));

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
        verify(passwordResetTokenRepository, never()).save(any());
        verify(auditService, never()).logAction(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    // ---------- resetPassword ----------

    @Test
    void resetPassword_validToken_updatesPassword() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        PasswordResetToken token = PasswordResetToken.builder()
                .token("tok").user(u).expiryDate(LocalDateTime.now().plusMinutes(10)).build();
        when(passwordResetTokenRepository.findByToken("tok")).thenReturn(Optional.of(token));
        when(passwordEncoder.encode("NewPassw0rd!")).thenReturn("newHash");

        authService.resetPassword(ResetPasswordRequestDTO.builder().token("tok").newPassword("NewPassw0rd!").build());

        assertEquals("newHash", u.getPassword());
        verify(userRepository).save(u);
        verify(passwordResetTokenRepository).delete(token);
        verify(auditService).logAction(eq("u1"), eq("PASSWORD_RESET_SUCCESS"), eq("USER"), eq("u1"), anyString());
    }

    @Test
    void resetPassword_invalidToken_isRejected() {
        when(passwordResetTokenRepository.findByToken("bad")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(
                ResetPasswordRequestDTO.builder().token("bad").newPassword("NewPassw0rd!").build()));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_expiredToken_isRejectedAndDeleted() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        PasswordResetToken token = PasswordResetToken.builder()
                .token("tok").user(u).expiryDate(LocalDateTime.now().minusMinutes(1)).build();
        when(passwordResetTokenRepository.findByToken("tok")).thenReturn(Optional.of(token));

        assertThrows(IllegalArgumentException.class, () -> authService.resetPassword(
                ResetPasswordRequestDTO.builder().token("tok").newPassword("NewPassw0rd!").build()));

        verify(passwordResetTokenRepository).delete(token);
        verify(userRepository, never()).save(any());
    }

    // ---------- changePassword ----------

    @Test
    void changePassword_correctOldPassword_succeeds() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("OldPassw0rd!", "hashed")).thenReturn(true);
        when(passwordEncoder.encode("NewPassw0rd!")).thenReturn("newHash");

        authService.changePassword("a@gigforce.com",
                ChangePasswordRequestDTO.builder().oldPassword("OldPassw0rd!").newPassword("NewPassw0rd!").build());

        assertEquals("newHash", u.getPassword());
        verify(userRepository).save(u);
        verify(auditService).logAction(eq("u1"), eq("PASSWORD_CHANGED"), eq("USER"), eq("u1"), anyString());
    }

    @Test
    void changePassword_wrongOldPassword_isRejected() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("bad", "hashed")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> authService.changePassword("a@gigforce.com",
                ChangePasswordRequestDTO.builder().oldPassword("bad").newPassword("NewPassw0rd!").build()));
        verify(userRepository, never()).save(any());
    }

    // ---------- logout ----------

    @Test
    void logout_audits() {
        User u = user("u1", "a@gigforce.com", UserRole.CONTRACTOR, UserStatus.ACTIVE);
        when(userRepository.findByEmail("a@gigforce.com")).thenReturn(Optional.of(u));

        authService.logout("a@gigforce.com");

        verify(auditService).logAction(eq("u1"), eq("USER_LOGOUT"), eq("USER"), eq("u1"), anyString());
    }
}

package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.dto.UserResponseDTO;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.mapper.UserMapper;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.publisher.NotificationPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 1 - Identity & Access Management: UserService unit tests.
 * Covers retrieval, filtering, profile update, and status transitions (with audit).
 */
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private UserMapper userMapper;
    @Mock private AuditService auditService;
    @Mock private NotificationPublisher notificationPublisher;

    @InjectMocks private UserServiceImpl userService;

    private static final String ACTOR_EMAIL = "admin@gigforce.com";

    @BeforeEach
    void setActor() {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken(ACTOR_EMAIL, null));
        SecurityContextHolder.setContext(ctx);
    }

    @AfterEach
    void clearActor() {
        SecurityContextHolder.clearContext();
    }

    private User user(String id, UserStatus status) {
        User u = User.builder()
                .name("Old Name")
                .email("target@gigforce.com")
                .password("hashed")
                .phone("1111111111")
                .role(UserRole.CONTRACTOR)
                .status(status)
                .orgUnitId("ORG1")
                .build();
        u.setId(id);
        return u;
    }

    private void stubActorLookup() {
        User actor = user("actor-id", UserStatus.ACTIVE);
        when(userRepository.findByEmail(ACTOR_EMAIL)).thenReturn(Optional.of(actor));
    }

    // ---------- getUserById ----------

    @Test
    void getUserById_found_returnsDto() {
        User u = user("u1", UserStatus.ACTIVE);
        when(userRepository.findById("u1")).thenReturn(Optional.of(u));
        when(userMapper.toUserDto(u)).thenReturn(UserResponseDTO.builder().userId("u1").build());

        assertEquals("u1", userService.getUserById("u1").getUserId());
    }

    @Test
    void getUserById_notFound_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class, () -> userService.getUserById("missing"));
    }

    // ---------- getAllUsers ----------

    @Test
    @SuppressWarnings("unchecked")
    void getAllUsers_returnsMappedPage() {
        User u = user("u1", UserStatus.ACTIVE);
        Page<User> page = new PageImpl<>(List.of(u));
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(userMapper.toUserDto(u)).thenReturn(UserResponseDTO.builder().userId("u1").build());

        Page<UserResponseDTO> result = userService.getAllUsers(0, 10, "CONTRACTOR", "ACTIVE");

        assertEquals(1, result.getTotalElements());
        assertEquals("u1", result.getContent().get(0).getUserId());
    }

    // ---------- updateUser ----------

    @Test
    void updateUser_updatesFieldsAndAudits() {
        User u = user("u1", UserStatus.ACTIVE);
        when(userRepository.findById("u1")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        stubActorLookup();
        when(userMapper.toUserDto(any(User.class))).thenReturn(UserResponseDTO.builder().userId("u1").build());

        userService.updateUser("u1",  "2222222222");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals("New Name", captor.getValue().getName());
        assertEquals("2222222222", captor.getValue().getPhone());
        verify(auditService).logAction(eq("actor-id"), eq("USER_UPDATED"), eq("USER"), eq("u1"), anyString());
    }

    @Test
    void updateUser_notFound_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class,
                () -> userService.updateUser("missing", "3333333333"));
        verify(userRepository, never()).save(any());
    }

    // ---------- status transitions ----------

    @Test
    void suspendUser_setsSuspended_auditsAndNotifies() {
        User u = user("u1", UserStatus.ACTIVE);
        when(userRepository.findById("u1")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        stubActorLookup();
        when(userMapper.toUserDto(any(User.class))).thenReturn(UserResponseDTO.builder().userId("u1").build());

        userService.suspendUser("u1");

        assertEquals(UserStatus.SUSPENDED, u.getStatus());
        verify(auditService).logAction(eq("actor-id"), eq("USER_SUSPENDED"), eq("USER"), eq("u1"), anyString());
        verify(notificationPublisher).publishContractorSuspended(u);
    }

    @Test
    void deactivateUser_setsInactiveAndAudits() {
        User u = user("u1", UserStatus.ACTIVE);
        when(userRepository.findById("u1")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        stubActorLookup();
        when(userMapper.toUserDto(any(User.class))).thenReturn(UserResponseDTO.builder().userId("u1").build());

        userService.deactivateUser("u1");

        assertEquals(UserStatus.INACTIVE, u.getStatus());
        verify(auditService).logAction(eq("actor-id"), eq("USER_DEACTIVATED"), eq("USER"), eq("u1"), anyString());
    }

    @Test
    void activateUser_setsActive_auditsAndNotifies() {
        User u = user("u1", UserStatus.SUSPENDED);
        when(userRepository.findById("u1")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        stubActorLookup();
        when(userMapper.toUserDto(any(User.class))).thenReturn(UserResponseDTO.builder().userId("u1").build());

        userService.activateUser("u1");

        assertEquals(UserStatus.ACTIVE, u.getStatus());
        verify(auditService).logAction(eq("actor-id"), eq("USER_ACTIVATED"), eq("USER"), eq("u1"), anyString());
        verify(notificationPublisher).publishContractorReactivated(u);
    }

    @Test
    void suspendUser_notFound_throws() {
        when(userRepository.findById("missing")).thenReturn(Optional.empty());
        assertThrows(UserNotFoundException.class, () -> userService.suspendUser("missing"));
        verify(userRepository, never()).save(any());
    }
}

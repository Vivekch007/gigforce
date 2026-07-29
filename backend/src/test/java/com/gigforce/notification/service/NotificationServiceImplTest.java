package com.gigforce.notification.service;

import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.dto.NotificationResponseDTO;
import com.gigforce.notification.entity.Notification;
import com.gigforce.notification.enums.NotificationCategory;
import com.gigforce.notification.enums.NotificationPriority;
import com.gigforce.notification.enums.NotificationStatus;
import com.gigforce.notification.repository.NotificationRepository;
import com.gigforce.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 8 - Notification service tests.
 * Covers creation (category/priority validation, duplicate-unread dedup), read/dismiss/delete
 * with ownership enforcement, unread count, admin system broadcast, and the search/filter
 * endpoint (status/category/priority/date, admin-sees-all vs per-user scoping).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NotificationServiceImplTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private CurrentUserContext currentUserContext;

    @InjectMocks private NotificationServiceImpl service;

    private User admin;
    private User contractor;
    private User otherContractor;

    @BeforeEach
    void setUp() {
        admin = user("ad1", "admin@x.com", UserRole.ADMIN);
        contractor = user("cu1", "arjun@x.com", UserRole.CONTRACTOR);
        otherContractor = user("cu2", "mallory@x.com", UserRole.CONTRACTOR);
    }

    private User user(String id, String email, UserRole role) {
        User u = User.builder().name("N-" + id).email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).orgUnitId("ORG1").build();
        u.setId(id);
        return u;
    }

    private void actingAs(User u) {
        when(currentUserContext.getCurrentUser()).thenReturn(u);
    }

    private Notification notification(String id, User owner, NotificationStatus status) {
        Notification n = Notification.builder()
                .user(owner).orgUnitId(owner.getOrgUnitId()).title("T").message("M")
                .category(NotificationCategory.GENERAL).status(status)
                .priority(NotificationPriority.MEDIUM).build();
        n.setId(id);
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }

    private NotificationRequestDTO req(String userId, String category, String priority) {
        return NotificationRequestDTO.builder()
                .userId(userId).message("Hello").category(category).priority(priority)
                .title("Title").build();
    }

    // ===================================================================
    // createNotification
    // ===================================================================

    @Test
    void createNotification_success_defaultsPriorityToMedium() {
        when(userRepository.findById("cu1")).thenReturn(Optional.of(contractor));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
            Notification n = i.getArgument(0);
            n.setId("n1");
            n.setCreatedAt(LocalDateTime.now());
            return n;
        });

        NotificationResponseDTO res = service.createNotification(req("cu1", "GENERAL", null));

        assertEquals("UNREAD", res.getStatus());
        assertEquals("MEDIUM", res.getPriority());
        assertEquals("GENERAL", res.getCategory());
    }

    @Test
    void createNotification_explicitPriority_honored() {
        when(userRepository.findById("cu1")).thenReturn(Optional.of(contractor));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
            Notification n = i.getArgument(0);
            n.setId("n1");
            n.setCreatedAt(LocalDateTime.now());
            return n;
        });

        NotificationResponseDTO res = service.createNotification(req("cu1", "TIMESHEET", "HIGH"));
        assertEquals("HIGH", res.getPriority());
    }

    @Test
    void createNotification_invalidPriority_fallsBackToMedium() {
        when(userRepository.findById("cu1")).thenReturn(Optional.of(contractor));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
            Notification n = i.getArgument(0);
            n.setId("n1");
            n.setCreatedAt(LocalDateTime.now());
            return n;
        });

        NotificationResponseDTO res = service.createNotification(req("cu1", "GENERAL", "URGENT"));
        assertEquals("MEDIUM", res.getPriority());
    }

    @Test
    void createNotification_invalidCategory_throws() {
        assertThrows(IllegalArgumentException.class, () -> service.createNotification(req("cu1", "NOT_A_CATEGORY", null)));
    }

    @Test
    void createNotification_userNotFound_throws() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.createNotification(req("ghost", "GENERAL", null)));
    }

    @Test
    void createNotification_duplicateUnreadWarning_returnsExistingInsteadOfCreatingNew() {
        NotificationRequestDTO dup = NotificationRequestDTO.builder()
                .userId("cu1").message("Cert expiring").category("COMPLIANCE")
                .notificationType("CERT_EXPIRY").referenceEntityId("cert1").referenceEntityType("ContractorCertification")
                .build();

        Notification existing = notification("existing1", contractor, NotificationStatus.UNREAD);
        existing.setNotificationType("CERT_EXPIRY");
        existing.setReferenceEntityId("cert1");
        existing.setReferenceEntityType("ContractorCertification");

        when(notificationRepository.existsByUserIdAndReferenceEntityIdAndReferenceEntityTypeAndNotificationTypeAndStatus(
                "cu1", "cert1", "ContractorCertification", "CERT_EXPIRY", NotificationStatus.UNREAD))
                .thenReturn(true);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc("cu1")).thenReturn(List.of(existing));

        NotificationResponseDTO res = service.createNotification(dup);

        assertEquals("existing1", res.getNotificationId());
        verify(notificationRepository, never()).save(any(Notification.class));
        verify(userRepository, never()).findById(anyString());
    }

    // ===================================================================
    // getNotificationById
    // ===================================================================

    @Test
    void getNotificationById_owner_success() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(contractor);

        assertEquals("n1", service.getNotificationById("n1").getNotificationId());
    }

    @Test
    void getNotificationById_admin_canViewAnyones() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(admin);

        assertEquals("n1", service.getNotificationById("n1").getNotificationId());
    }

    @Test
    void getNotificationById_otherUser_denied() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(otherContractor);

        assertThrows(AccessDeniedException.class, () -> service.getNotificationById("n1"));
    }

    @Test
    void getNotificationById_notFound_throws() {
        when(notificationRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getNotificationById("x"));
    }

    // ===================================================================
    // markRead
    // ===================================================================

    @Test
    void markRead_owner_setsReadStatusAndDate() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(contractor);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        NotificationResponseDTO res = service.markRead("n1");

        assertEquals("READ", res.getStatus());
        assertNotNull(n.getReadDate());
    }

    @Test
    void markRead_otherUser_denied() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(otherContractor);
        assertThrows(AccessDeniedException.class, () -> service.markRead("n1"));
    }

    // ===================================================================
    // dismiss
    // ===================================================================

    @Test
    void dismiss_owner_setsDismissedStatus() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(contractor);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        NotificationResponseDTO res = service.dismiss("n1");
        assertEquals("DISMISSED", res.getStatus());
    }

    @Test
    void dismiss_otherUser_denied() {
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(otherContractor);
        assertThrows(AccessDeniedException.class, () -> service.dismiss("n1"));
    }

    // ===================================================================
    // getMyNotifications (status / category / priority / date filters)
    // ===================================================================

    @Test
    void getMyNotifications_contractor_success() {
        actingAs(contractor);
        Notification n = notification("n1", contractor, NotificationStatus.UNREAD);
        when(notificationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(n));

        List<NotificationResponseDTO> res = service.getMyNotifications(null, null, null, null, null);

        assertEquals(1, res.size());
        verify(notificationRepository).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    void getMyNotifications_admin_success() {
        actingAs(admin);
        when(notificationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        assertTrue(service.getMyNotifications(null, null, null, null, null).isEmpty());
    }

    @Test
    void getMyNotifications_withValidStatusCategoryPriority_success() {
        actingAs(contractor);
        when(notificationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        assertDoesNotThrow(() -> service.getMyNotifications("UNREAD", "TIMESHEET", "HIGH", null, null));
    }

    @Test
    void getMyNotifications_withInvalidStatusCategoryPriority_ignoredNotThrown() {
        actingAs(contractor);
        when(notificationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
        assertDoesNotThrow(() -> service.getMyNotifications("NOT_A_STATUS", "NOT_A_CATEGORY", "NOT_A_PRIORITY", null, null));
    }

    @Test
    void getMyNotifications_withDateRange_success() {
        actingAs(contractor);
        when(notificationRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        assertDoesNotThrow(() -> service.getMyNotifications(
                null, null, null, LocalDate.now().minusDays(7), LocalDate.now()));
        verify(notificationRepository).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    void getMyNotifications_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class, () -> service.getMyNotifications(null, null, null, null, null));
    }

    // ===================================================================
    // getUnreadCount
    // ===================================================================

    @Test
    void getUnreadCount_success() {
        actingAs(contractor);
        when(notificationRepository.countByUserIdAndStatus("cu1", NotificationStatus.UNREAD)).thenReturn(3L);
        assertEquals(3L, service.getUnreadCount());
    }

    @Test
    void getUnreadCount_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class, () -> service.getUnreadCount());
    }

    // ===================================================================
    // deleteNotification
    // ===================================================================

    @Test
    void deleteNotification_owner_success() {
        Notification n = notification("n1", contractor, NotificationStatus.READ);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(contractor);

        service.deleteNotification("n1");
        verify(notificationRepository).delete(n);
    }

    @Test
    void deleteNotification_otherUser_denied() {
        Notification n = notification("n1", contractor, NotificationStatus.READ);
        when(notificationRepository.findById("n1")).thenReturn(Optional.of(n));
        actingAs(otherContractor);

        assertThrows(AccessDeniedException.class, () -> service.deleteNotification("n1"));
        verify(notificationRepository, never()).delete(any(Notification.class));
    }

    @Test
    void deleteNotification_notFound_throws() {
        when(notificationRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.deleteNotification("x"));
    }

    // ===================================================================
    // sendSystemNotification
    // ===================================================================

    @Test
    void sendSystemNotification_admin_success() {
        actingAs(admin);
        when(userRepository.findById("cu1")).thenReturn(Optional.of(contractor));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> {
            Notification n = i.getArgument(0);
            n.setId("n1");
            n.setCreatedAt(LocalDateTime.now());
            return n;
        });

        NotificationResponseDTO res = service.sendSystemNotification(req("cu1", "GENERAL", null));
        assertEquals("n1", res.getNotificationId());
    }

    @Test
    void sendSystemNotification_nonAdmin_denied() {
        actingAs(contractor);
        assertThrows(AccessDeniedException.class, () -> service.sendSystemNotification(req("cu1", "GENERAL", null)));
    }

    @Test
    void sendSystemNotification_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class, () -> service.sendSystemNotification(req("cu1", "GENERAL", null)));
    }
}

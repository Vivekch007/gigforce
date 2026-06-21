package com.gigforce.notification.service;

import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.dto.NotificationResponseDTO;
import com.gigforce.notification.entity.Notification;
import com.gigforce.notification.enums.NotificationCategory;
import com.gigforce.notification.enums.NotificationStatus;
import com.gigforce.notification.repository.NotificationRepository;
import com.gigforce.security.CurrentUserContext;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;

    public NotificationServiceImpl(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            CurrentUserContext currentUserContext) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
    }

    @Override
    @Transactional
    public NotificationResponseDTO createNotification(NotificationRequestDTO request) {
        // Validate Category
        NotificationCategory category;
        try {
            category = NotificationCategory.valueOf(request.getCategory().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid notification category: " + request.getCategory());
        }

        // Duplicate Warning Prevention: Check if active unread warning already exists
        if (request.getNotificationType() != null && request.getReferenceEntityId() != null && request.getReferenceEntityType() != null) {
            boolean exists = notificationRepository.existsByUserIdAndReferenceEntityIdAndReferenceEntityTypeAndNotificationTypeAndStatus(
                    request.getUserId(),
                    request.getReferenceEntityId(),
                    request.getReferenceEntityType(),
                    request.getNotificationType(),
                    NotificationStatus.UNREAD
            );
            if (exists) {
                // Return existing unread notification to prevent duplication
                List<Notification> existing = notificationRepository.findByUserIdOrderByCreatedAtDesc(request.getUserId());
                for (Notification n : existing) {
                    if (n.getStatus() == NotificationStatus.UNREAD
                            && request.getNotificationType().equals(n.getNotificationType())
                            && request.getReferenceEntityId().equals(n.getReferenceEntityId())
                            && request.getReferenceEntityType().equals(n.getReferenceEntityType())) {
                        return mapToDto(n);
                    }
                }
            }
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + request.getUserId()));

        Notification notification = Notification.builder()
                .user(user)
                .message(request.getMessage())
                .category(category)
                .status(NotificationStatus.UNREAD)
                .notificationType(request.getNotificationType())
                .referenceEntityId(request.getReferenceEntityId())
                .referenceEntityType(request.getReferenceEntityType())
                .build();

        notification = notificationRepository.save(notification);
        return mapToDto(notification);
    }

    @Override
    public NotificationResponseDTO getNotificationById(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));

        validateOwnership(notification);
        return mapToDto(notification);
    }

    @Override
    @Transactional
    public NotificationResponseDTO markRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));

        validateOwnership(notification);
        notification.setStatus(NotificationStatus.READ);
        notification.setReadDate(LocalDateTime.now());
        notification = notificationRepository.save(notification);
        return mapToDto(notification);
    }

    @Override
    @Transactional
    public NotificationResponseDTO dismiss(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));

        validateOwnership(notification);
        notification.setStatus(NotificationStatus.DISMISSED);
        notification = notificationRepository.save(notification);
        return mapToDto(notification);
    }

    @Override
    public List<NotificationResponseDTO> getMyNotifications() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        boolean isAdmin = "ADMIN".equals(currentUser.getRole().name());
        List<Notification> list;
        if (isAdmin) {
            list = notificationRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        } else {
            list = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        }

        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public Long getUnreadCount() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        return notificationRepository.countByStatus(NotificationStatus.UNREAD);
    }

    private void validateOwnership(Notification notification) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        boolean isAdmin = "ADMIN".equals(currentUser.getRole().name());
        if (!isAdmin && !notification.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to access this notification.");
        }
    }

    private NotificationResponseDTO mapToDto(Notification notification) {
        return NotificationResponseDTO.builder()
                .notificationId(notification.getId())
                .userId(notification.getUser().getId())
                .message(notification.getMessage())
                .category(notification.getCategory().name())
                .status(notification.getStatus().name())
                .createdDate(notification.getCreatedDate())
                .notificationType(notification.getNotificationType())
                .referenceEntityId(notification.getReferenceEntityId())
                .referenceEntityType(notification.getReferenceEntityType())
                .readDate(notification.getReadDate())
                .build();
    }
}

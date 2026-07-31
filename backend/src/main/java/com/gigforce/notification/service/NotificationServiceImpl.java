package com.gigforce.notification.service;

import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.dto.NotificationResponseDTO;
import com.gigforce.notification.entity.Notification;
import com.gigforce.notification.enums.NotificationCategory;
import com.gigforce.notification.enums.NotificationStatus;
import com.gigforce.notification.enums.NotificationPriority;
import com.gigforce.notification.repository.NotificationRepository;
import com.gigforce.security.CurrentUserContext;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
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

        NotificationPriority priority = NotificationPriority.MEDIUM;
        if (request.getPriority() != null && !request.getPriority().trim().isEmpty()) {
            try {
                priority = NotificationPriority.valueOf(request.getPriority().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                // Keep default MEDIUM
            }
        }

        Notification notification = Notification.builder()
                .user(user)
                .orgUnitId(request.getOrgUnitId() != null ? request.getOrgUnitId() : user.getOrgUnitId())
                .title(request.getTitle())
                .message(request.getMessage())
                .category(category)
                .status(NotificationStatus.UNREAD)
                .priority(priority)
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
    public NotificationResponseDTO markUnread(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));

        validateOwnership(notification);
        notification.setStatus(NotificationStatus.UNREAD);
        notification.setReadDate(null);
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
    public List<NotificationResponseDTO> getMyNotifications(String status, String category, String priority,
            LocalDate fromDate, LocalDate toDate) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        Specification<Notification> spec = Specification.where(null);

        boolean isAdmin = "ADMIN".equals(currentUser.getRole().name());
        if (!isAdmin) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), currentUser.getId()));
        }

        if (status != null && !status.trim().isEmpty()) {
            try {
                NotificationStatus enumStatus = NotificationStatus.valueOf(status.toUpperCase().trim());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), enumStatus));
            } catch (IllegalArgumentException e) {
                // Ignore invalid
            }
        }

        if (category != null && !category.trim().isEmpty()) {
            try {
                NotificationCategory enumCategory = NotificationCategory.valueOf(category.toUpperCase().trim());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), enumCategory));
            } catch (IllegalArgumentException e) {
                // Ignore invalid
            }
        }

        if (priority != null && !priority.trim().isEmpty()) {
            try {
                NotificationPriority enumPriority = NotificationPriority.valueOf(priority.toUpperCase().trim());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), enumPriority));
            } catch (IllegalArgumentException e) {
                // Ignore invalid
            }
        }

        // Date filter: createdAt falls within [fromDate 00:00, toDate 23:59:59.999]
        if (fromDate != null) {
            LocalDateTime fromDateTime = fromDate.atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fromDateTime));
        }
        if (toDate != null) {
            LocalDateTime toDateTime = toDate.plusDays(1).atStartOfDay();
            spec = spec.and((root, query, cb) -> cb.lessThan(root.get("createdAt"), toDateTime));
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return notificationRepository.findAll(spec, sort).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public Long getUnreadCount() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        return notificationRepository.countByUserIdAndStatus(currentUser.getId(), NotificationStatus.UNREAD);
    }

    @Override
    @Transactional
    public void deleteNotification(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with ID: " + id));

        validateOwnership(notification);
        notificationRepository.delete(notification);
    }

    @Override
    @Transactional
    public int markAllAsRead() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }
        return notificationRepository.markAllAsReadByUserId(
                currentUser.getId(), 
                NotificationStatus.READ, 
                NotificationStatus.UNREAD
        );
    }

    @Override
    @Transactional
    public void deleteAllNotifications() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }
        notificationRepository.deleteAllByUserId(currentUser.getId());
    }

    @Override
    @Transactional
    public NotificationResponseDTO sendSystemNotification(NotificationRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        if (!"ADMIN".equals(currentUser.getRole().name())) {
            throw new AccessDeniedException("Access Denied: Only Admin users can send system notifications.");
        }

        return createNotification(request);
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
                .title(notification.getTitle())
                .orgUnitId(notification.getOrgUnitId())
                .priority(notification.getPriority() != null ? notification.getPriority().name() : null)
                .relatedEntityId(notification.getRelatedEntityId())
                .relatedEntityType(notification.getRelatedEntityType())
                .readAt(notification.getReadAt())
                .build();
    }
}

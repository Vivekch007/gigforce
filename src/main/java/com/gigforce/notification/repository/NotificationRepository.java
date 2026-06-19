package com.gigforce.notification.repository;

import com.gigforce.notification.entity.Notification;
import com.gigforce.notification.enums.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    Long countByUserIdAndStatus(String userId, NotificationStatus status);

    boolean existsByUserIdAndReferenceEntityIdAndReferenceEntityTypeAndNotificationTypeAndStatus(
            String userId,
            String referenceEntityId,
            String referenceEntityType,
            String notificationType,
            NotificationStatus status
    );
}

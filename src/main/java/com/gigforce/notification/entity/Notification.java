package com.gigforce.notification.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.User;
import com.gigforce.notification.enums.NotificationCategory;
import com.gigforce.notification.enums.NotificationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notification_user", columnList = "user_id"),
        @Index(name = "idx_notification_status", columnList = "status"),
        @Index(name = "idx_notification_category", columnList = "category"),
        @Index(name = "idx_notification_created", columnList = "created_date")
    }
)
@AttributeOverrides({
    @AttributeOverride(name = "id", column = @Column(name = "notification_id", length = 64)),
    @AttributeOverride(name = "createdAt", column = @Column(name = "created_date", nullable = false, updatable = false))
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_notifications_user"))
    private User user;

    @Column(name = "message", nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private NotificationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private NotificationStatus status;

    @Column(name = "notification_type", length = 100)
    private String notificationType;

    @Column(name = "reference_entity_id", length = 64)
    private String referenceEntityId;

    @Column(name = "reference_entity_type", length = 100)
    private String referenceEntityType;

    @Column(name = "read_date")
    private LocalDateTime readDate;

    @Version
    @Column(name = "version")
    private Long version;

    public String getNotificationID() {
        return getId();
    }

    public void setNotificationID(String notificationId) {
        setId(notificationId);
    }

    public LocalDateTime getCreatedDate() {
        return getCreatedAt();
    }

    public void setCreatedDate(LocalDateTime createdDate) {
        setCreatedAt(createdDate);
    }

    public String getUserID() {
        return user != null ? user.getId() : null;
    }
}

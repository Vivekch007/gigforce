package com.gigforce.audit.entity;

import com.gigforce.common.entity.BaseEntity;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "audit_logs",
    indexes = {
        @Index(name = "idx_audit_user_id", columnList = "user_id"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp")
    }
)
@AttributeOverrides({
    @AttributeOverride(name = "id", column = @Column(name = "audit_id")),
    @AttributeOverride(name = "createdAt", column = @Column(name = "timestamp", nullable = false, updatable = false))
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog extends BaseEntity {

    @Column(name = "user_id")
    private String userId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    @Column(length = 500)
    private String description;

    public LocalDateTime getTimestamp() {
        return getCreatedAt();
    }
}

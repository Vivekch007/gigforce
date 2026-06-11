package com.gigforce.requisition.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.requisition.enums.RequisitionStatus;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(
    name = "resource_requisitions",
    indexes = {
        @Index(name = "idx_req_skill_id", columnList = "required_skill_id"),
        @Index(name = "idx_req_status", columnList = "status"),
        @Index(name = "idx_req_created_by", columnList = "created_by_user_id")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "resource_requisition_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceRequisition extends BaseEntity {

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "required_skill_id", nullable = false)
    private Skill requiredSkill;

    @Column(name = "min_experience_years", nullable = false)
    private Integer minExperienceYears;

    @Column(name = "max_hourly_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxHourlyRate;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequisitionStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User creator;

    
}

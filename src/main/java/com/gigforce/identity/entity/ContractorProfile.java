package com.gigforce.identity.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(
    name = "contractor_profiles",
    indexes = {
        @Index(name = "idx_contractor_user_id", columnList = "user_id"),
        @Index(name = "idx_contractor_status", columnList = "profile_status")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "contractor_profile_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    // Title & bio removed per new requirements

    @Column(name = "hourly_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "experience_years", nullable = false)
    private Integer experienceYears;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status", nullable = false, length = 30)
    private AvailabilityStatus availabilityStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_status", nullable = false, length = 30)
    private ProfileStatus profileStatus;

    
}

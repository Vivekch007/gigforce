package com.gigforce.identity.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
    name = "engagement_histories",
    indexes = {
        @Index(name = "idx_engagement_profile_id", columnList = "contractor_profile_id")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "engagement_history_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngagementHistory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    @Column(name = "client_name", nullable = false, length = 150)
    private String clientName;

    @Column(name = "role_title", nullable = false, length = 150)
    private String roleTitle;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(length = 500)
    private String feedback;

    private Integer rating; // Rating e.g. 1 to 5

    @Column(name = "verifyer_name")
    private String Verifyer_name;
    @Column(name = "verifyer_email")
    private String Verifyer_email;
    @Column(name = "verifyer_phone")
    private String Verifyer_phone;

    @Column(name = "Approval_status")
    @Enumerated(EnumType.STRING)
    private VerificationStatus Approval_status;
}

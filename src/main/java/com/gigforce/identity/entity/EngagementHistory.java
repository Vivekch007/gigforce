package com.gigforce.identity.entity;

import com.gigforce.common.entity.BaseEntity;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.time.LocalDate;

@Entity
@Table(
    name = "engagement_histories",
    indexes = {
        @Index(name = "idx_engagement_profile_id", columnList = "contractor_profile_id"),
        @Index(name = "idx_engagement_client_org_id", columnList = "client_org_id")
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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_org_id", nullable = false)
    private Organization clientOrganization;

    @Column(name = "role_title", nullable = false, length = 150)
    private String roleTitle;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(length = 500)
    private String feedback;

    private Integer rating; // Rating e.g. 1 to 5
}

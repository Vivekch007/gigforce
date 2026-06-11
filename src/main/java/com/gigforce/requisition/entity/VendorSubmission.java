package com.gigforce.requisition.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.requisition.enums.SubmissionStatus;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(
    name = "vendor_submissions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uc_requisition_contractor", columnNames = {"resource_requisition_id", "contractor_profile_id"})
    },
    indexes = {
        @Index(name = "idx_sub_req_id", columnList = "resource_requisition_id"),
        @Index(name = "idx_sub_profile_id", columnList = "contractor_profile_id"),
        @Index(name = "idx_sub_status", columnList = "status")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "vendor_submission_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorSubmission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_requisition_id", nullable = false)
    private ResourceRequisition requisition;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by_user_id", nullable = false)
    private User submittedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SubmissionStatus status;

    @Column(name = "proposed_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal proposedRate;

    @Column(length = 255)
    private String remarks;

    
}

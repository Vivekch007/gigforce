package com.gigforce.assignment.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.enums.EngagementType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "assignments", indexes = {
        @Index(name = "idx_assign_profile", columnList = "contractor_profile_id"),
        @Index(name = "idx_assign_status", columnList = "status"),
        @Index(name = "idx_assign_manager", columnList = "assignee_id"),
        @Index(name = "idx_assign_vendor", columnList = "vendor_user_id"),
        @Index(name = "idx_assign_submission", columnList = "vendor_submission_id"),
        @Index(name = "idx_assign_org_unit", columnList = "org_unit_id")
})
@AttributeOverride(name = "id", column = @Column(name = "assignment_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_requisition_id")
    private ResourceRequisition requisition;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    // Fixed to map correctly to your assignee_id column
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignee_id", nullable = false)
    private User hiringManager;

    // FIXED: Removed insertable=false, updatable=false so Hibernate can write to this column
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_user_id")
    private User vendor;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_submission_id", unique = true)
    private VendorSubmission vendorSubmission;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "agreed_rate_per_day", nullable = false, precision = 10, scale = 2)
    private BigDecimal agreedRatePerDay;

    @Enumerated(EnumType.STRING)
    @Column(name = "engagement_type", nullable = false, length = 30)
    private EngagementType engagementType;

    @Column(name = "sow_reference", length = 150)
    private String sowReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssignmentStatus status;

    @Column(name = "org_unit_id", length = 64)
    private String orgUnitId;

    @Column(name = "purchase_order_id", length = 64)
    private String purchaseOrderId;
}
package com.gigforce.assignment.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "timesheet_approvals", indexes = {
        @Index(name = "idx_approval_timesheet", columnList = "timesheet_id")
})
@AttributeOverride(name = "id", column = @Column(name = "approval_id", length = 64))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetApproval extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "timesheet_id", nullable = false)
    private Timesheet timesheet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "approver_id", nullable = false)
    private User approver;

    @Column(name = "approval_level", nullable = false, length = 50)
    private String approvalLevel; // E.g., L1_MANAGER, L2_FINANCE

    @Column(name = "action", nullable = false, length = 50)
    private String action; // APPROVED, REJECTED, SUBMIT

    @Column(name = "remarks", length = 500)
    private String remarks;

    @Column(name = "action_date", nullable = false)
    private LocalDateTime actionDate;
}

package com.gigforce.assignment.entity;

import com.gigforce.identity.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "timesheet_approvals", indexes = {
        @Index(name = "idx_approval_timesheet", columnList = "timesheet_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetApproval {

    @Id
    @Column(name = "approval_id", length = 64)
    private String id;

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

package com.gigforce.assignment.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.assignment.enums.PayrollStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "timesheets", uniqueConstraints = {
        @UniqueConstraint(name = "uq_contractor_assignment_week", columnNames = { "contractor_profile_id", "assignment_id",
                "week_start_date" })
}, indexes = {
        @Index(name = "idx_timesheet_status", columnList = "status"),
        @Index(name = "idx_timesheet_assignment", columnList = "assignment_id"),
        @Index(name = "idx_timesheet_contractor", columnList = "contractor_profile_id"),
        @Index(name = "idx_timesheet_week", columnList = "week_start_date"),
        @Index(name = "idx_timesheet_payroll_status", columnList = "payroll_status"),
        @Index(name = "idx_timesheet_org_unit", columnList = "org_unit_id")
})
@AttributeOverride(name = "id", column = @Column(name = "timesheet_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Timesheet extends BaseEntity {

    @Column(name = "org_unit_id", length = 64)
    private String orgUnitId;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractor;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "week_end_date", nullable = false)
    private LocalDate weekEndDate;

    @Builder.Default
    @Column(name = "hours_logged", nullable = false, precision = 5, scale = 2)
    private BigDecimal hoursLogged = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "overtime_logged", nullable = false, precision = 5, scale = 2)
    private BigDecimal overtimeLogged = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TimesheetStatus status;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "payroll_status", nullable = false, length = 30)
    private PayrollStatus payrollStatus = PayrollStatus.NOT_PROCESSED;

    @Builder.Default
    @Column(name = "billable_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal billableAmount = BigDecimal.ZERO;

    @Column(name = "submitted_date")
    private LocalDateTime submittedDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_hiring_manager_id")
    private User approvedByHiringManager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_finance_id")
    private User approvedByFinance;

    @Column(name = "approved_date")
    private LocalDateTime approvedDate;

    @Column(name = "payroll_processed_date")
    private LocalDateTime payrollProcessedDate;

    @Column(name = "agreed_rate_per_day", precision = 10, scale = 2)
    private BigDecimal agreedRatePerDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private com.gigforce.invoice.entity.ContractorInvoice invoice;

}

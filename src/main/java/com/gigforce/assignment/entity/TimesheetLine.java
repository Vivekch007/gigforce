package com.gigforce.assignment.entity;

import com.gigforce.identity.entity.ContractorAbsence;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "timesheet_lines", uniqueConstraints = {
        @UniqueConstraint(name = "uq_timesheet_work_date", columnNames = { "timesheet_id", "work_date" })
}, indexes = {
        @Index(name = "idx_line_date", columnList = "work_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetLine {

    @Id
    @Column(name = "timesheet_line_id", length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "timesheet_id", nullable = false)
    private Timesheet timesheet;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "hours_worked", nullable = false, precision = 4, scale = 2, columnDefinition = "DECIMAL(4,2) CHECK (hours_worked >= 0.00)")
    private BigDecimal hoursWorked = BigDecimal.ZERO;

    @Column(name = "overtime_hours", nullable = false, precision = 4, scale = 2, columnDefinition = "DECIMAL(4,2) CHECK (overtime_hours >= 0.00)")
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    @Column(name = "activity_desc", nullable = false, length = 255)
    private String activityDesc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "absence_id")
    private ContractorAbsence absence;
}

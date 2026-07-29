package com.gigforce.analytics.entity;

import com.gigforce.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "workforce_reports",
    indexes = {
        @Index(name = "idx_report_scope", columnList = "Scope"),
        @Index(name = "idx_report_generated", columnList = "GeneratedDate")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "ReportID", length = 64))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkforceReport extends BaseEntity {

    @Column(name = "Scope", nullable = false, length = 100)
    private String scope;

    @Column(name = "ActiveContractors", nullable = false)
    private Integer activeContractors;

    @Column(name = "TotalSpend", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalSpend;

    @Column(name = "FillRate", nullable = false, precision = 5, scale = 2)
    private BigDecimal fillRate;

    @Column(name = "AvgTimeToFill", nullable = false, precision = 8, scale = 2)
    private BigDecimal avgTimeToFill;

    @Column(name = "TimesheetApprovalRate", nullable = false, precision = 5, scale = 2)
    private BigDecimal timesheetApprovalRate;

    @Column(name = "ComplianceExpiryCount", nullable = false)
    private Integer complianceExpiryCount;

    @Column(name = "GeneratedDate", nullable = false)
    private LocalDateTime generatedDate;

    @Version
    @Column(name = "Version")
    private Long version;

    public String getReportID() {
        return getId();
    }

    public void setReportID(String reportId) {
        setId(reportId);
    }
}

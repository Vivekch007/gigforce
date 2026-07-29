package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkforceReportResponseDTO {
    @JsonProperty("ReportID")
    private String reportId;

    @JsonProperty("Scope")
    private String scope;

    @JsonProperty("ActiveContractors")
    private Integer activeContractors;

    @JsonProperty("TotalSpend")
    private BigDecimal totalSpend;

    @JsonProperty("FillRate")
    private BigDecimal fillRate;

    @JsonProperty("AvgTimeToFill")
    private BigDecimal avgTimeToFill;

    @JsonProperty("TimesheetApprovalRate")
    private BigDecimal timesheetApprovalRate;

    @JsonProperty("ComplianceExpiryCount")
    private Integer complianceExpiryCount;

    @JsonProperty("GeneratedDate")
    private LocalDateTime generatedDate;
}

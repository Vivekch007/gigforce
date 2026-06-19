package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecutiveDashboardResponseDTO {
    @JsonProperty("ActiveContractors")
    private Long activeContractors;

    @JsonProperty("OpenRequisitions")
    private Long openRequisitions;

    @JsonProperty("FilledRequisitions")
    private Long filledRequisitions;

    @JsonProperty("ActiveAssignments")
    private Long activeAssignments;

    @JsonProperty("ApprovedTimesheets")
    private Long approvedTimesheets;

    @JsonProperty("ApprovedInvoiceAmount")
    private BigDecimal approvedInvoiceAmount;

    @JsonProperty("PaidAmount")
    private BigDecimal paidAmount;

    @JsonProperty("ComplianceExpiries")
    private Long complianceExpiries;
}

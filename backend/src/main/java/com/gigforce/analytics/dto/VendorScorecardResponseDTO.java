package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorScorecardResponseDTO {
    @JsonProperty("VendorID")
    private String vendorId;

    @JsonProperty("TotalSubmissions")
    private Long totalSubmissions;

    @JsonProperty("SelectedSubmissions")
    private Long selectedSubmissions;

    @JsonProperty("RejectedSubmissions")
    private Long rejectedSubmissions;

    @JsonProperty("SelectionRate")
    private BigDecimal selectionRate;

    @JsonProperty("FillRate")
    private BigDecimal fillRate;

    @JsonProperty("ActiveAssignments")
    private Long activeAssignments;

    @JsonProperty("TotalRevenueGenerated")
    private BigDecimal totalRevenueGenerated;
}

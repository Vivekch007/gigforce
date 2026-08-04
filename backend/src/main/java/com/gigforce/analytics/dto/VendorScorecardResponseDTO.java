package com.gigforce.analytics.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorScorecardResponseDTO {
    private String vendorId;
    private Long totalSubmissions;
    private Long selectedSubmissions;
    private Long rejectedSubmissions;
    private BigDecimal selectionRate;
    private BigDecimal fillRate;
    private Long activeAssignments;
    private BigDecimal totalRevenueGenerated;
}

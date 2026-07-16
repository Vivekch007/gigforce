package com.gigforce.analytics.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequisitionReportRowDTO {
    private String requisitionId;
    private String title;
    private String skillName;
    private String status;
    private String businessUnitId;
    private String orgUnitId;
    private Integer quantity;
    private BigDecimal maxHourlyRate;
    private String engagementType;
    private LocalDate startDate;
}

package com.gigforce.analytics.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalDashboardResponseDTO {
    private Long activeAssignmentsCount;
    private BigDecimal totalHoursLogged;
    private Long pendingTimesheetsCount;
    private BigDecimal totalPaidAmount;
}

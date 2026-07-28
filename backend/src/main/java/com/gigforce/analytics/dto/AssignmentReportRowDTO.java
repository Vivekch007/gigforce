package com.gigforce.analytics.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentReportRowDTO {
    private String assignmentId;
    private String contractorName;
    private String hiringManagerName;
    private String vendorName;
    private String status;
    private BigDecimal agreedRatePerDay;
    private String engagementType;
    private LocalDate startDate;
    private LocalDate endDate;
    private String orgUnitId;
}

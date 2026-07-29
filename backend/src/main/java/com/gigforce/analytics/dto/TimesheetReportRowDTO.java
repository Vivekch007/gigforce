package com.gigforce.analytics.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetReportRowDTO {
    private String timesheetId;
    private String assignmentId;
    private String contractorName;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private BigDecimal hoursLogged;
    private BigDecimal overtimeLogged;
    private String status;
}

package com.gigforce.assignment.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetLineResponseDTO {
    private String id;
    private LocalDate workDate;
    private BigDecimal hoursWorked;
    private BigDecimal overtimeHours;
    private String activityDesc;
    private String absenceId;
}

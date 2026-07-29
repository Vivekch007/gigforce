package com.gigforce.assignment.dto;

import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.assignment.enums.PayrollStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetResponseDTO {
    private String id;
    private String assignmentId;
    private String contractorUserId;
    private String contractorName;
    private LocalDate weekStartDate;
    private LocalDate weekEndDate;
    private BigDecimal hoursLogged;
    private BigDecimal overtimeLogged;
    private TimesheetStatus status;
    private PayrollStatus payrollStatus;
    private BigDecimal billableAmount;
    private LocalDateTime submittedDate;
    private String approvedByHiringManagerId;
    private String approvedByFinanceId;
    private LocalDateTime approvedDate;
    private LocalDateTime payrollProcessedDate;
    private List<TimesheetLineResponseDTO> lines;
}

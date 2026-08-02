package com.gigforce.assignment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private BigDecimal agreedRatePerDay;

    // -----------------------------------------------------------------------
    // Alias getters for frontend compatibility
    // Frontend uses startDate / endDate / totalHoursLogged field names.
    // These are computed at serialisation time and do NOT duplicate storage.
    // -----------------------------------------------------------------------

    @JsonProperty("startDate")
    public LocalDate getStartDate() {
        return weekStartDate;
    }

    @JsonProperty("endDate")
    public LocalDate getEndDate() {
        return weekEndDate;
    }

    @JsonProperty("totalHoursLogged")
    public BigDecimal getTotalHoursLogged() {
        if (hoursLogged == null && overtimeLogged == null) return BigDecimal.ZERO;
        BigDecimal h = hoursLogged != null ? hoursLogged : BigDecimal.ZERO;
        BigDecimal o = overtimeLogged != null ? overtimeLogged : BigDecimal.ZERO;
        return h.add(o);
    }
}

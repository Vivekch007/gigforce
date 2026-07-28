package com.gigforce.assignment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetLineRequestDTO {

    @NotNull(message = "Work date is required")
    private LocalDate workDate;

    @NotNull(message = "Hours worked is required")
    @DecimalMin(value = "0.00", message = "Hours worked must be non-negative")
    private BigDecimal hoursWorked;

    // Required only when hoursWorked > 0 (validated in the service); a day with 0 hours may omit it
    @Size(max = 255, message = "Activity description must not exceed 255 characters")
    private String activityDesc;
}

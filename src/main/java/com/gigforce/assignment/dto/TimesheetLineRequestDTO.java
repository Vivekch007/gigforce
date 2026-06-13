package com.gigforce.assignment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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

    @NotBlank(message = "Activity description is required")
    @Size(max = 255, message = "Activity description must not exceed 255 characters")
    private String activityDesc;
}

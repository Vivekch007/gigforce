package com.gigforce.assignment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetRequestDTO {

    @NotNull(message = "Assignment ID is required")
    private String assignmentId;

    @NotNull(message = "Week start date is required")
    private LocalDate weekStartDate;

    // Optional on create (backend pre-generates the Mon-Fri skeleton).
    // Required on update: contractor fills hoursWorked + activityDesc per weekday.
    @Valid
    private List<TimesheetLineRequestDTO> lines;
}

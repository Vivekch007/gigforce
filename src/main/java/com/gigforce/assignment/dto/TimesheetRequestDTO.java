package com.gigforce.assignment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotEmpty(message = "Timesheet lines cannot be empty")
    @Valid

    private List<TimesheetLineRequestDTO> lines;
}

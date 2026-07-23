package com.gigforce.assignment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetCreateRequestDTO {

    @NotNull(message = "Assignment ID is required")
    private String assignmentId;

    @NotNull(message = "Week start date is required")
    private LocalDate weekStartDate;

}

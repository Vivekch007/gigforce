package com.gigforce.assignment.dto;

import jakarta.validation.Valid;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetUpdateRequestDTO {

    // Required on update: contractor fills hoursWorked + activityDesc per weekday.
    @Valid
    private List<TimesheetLineRequestDTO> lines;
}

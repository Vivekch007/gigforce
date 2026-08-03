package com.gigforce.assignment.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyTimesheetGenerateResponseDTO {

    private int weeksCreated;
    private boolean truncated;
    private LocalDate finalEffectiveEndDate;

}

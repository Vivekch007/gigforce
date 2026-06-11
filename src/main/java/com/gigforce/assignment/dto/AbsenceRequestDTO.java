package com.gigforce.assignment.dto;

import com.gigforce.assignment.enums.AbsenceType;
import com.gigforce.assignment.enums.AbsenceDuration;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AbsenceRequestDTO {

    @NotNull(message = "Assignment ID is required")
    private String assignmentId;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Absence type is required")
    private AbsenceType absenceType;

    @NotNull(message = "Absence duration is required")
    private AbsenceDuration duration;

    @NotBlank(message = "Reason is required")
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;
}

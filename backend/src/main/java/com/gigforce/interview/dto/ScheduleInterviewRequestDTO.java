package com.gigforce.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleInterviewRequestDTO {

    @NotBlank(message = "Vendor submission ID is required")
    private String vendorSubmissionId;

    @NotBlank(message = "Candidate name is required")
    private String candidateName;

    @NotNull(message = "Date is required")
    private java.time.LocalDate date;

    private String time;

    private String interviewType; // VIDEO, ONSITE, PHONE
}

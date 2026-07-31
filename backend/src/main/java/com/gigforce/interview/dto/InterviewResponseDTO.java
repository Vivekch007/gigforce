package com.gigforce.interview.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewResponseDTO {
    private String id;
    private String vendorSubmissionId;
    private String candidateName;
    private String date;
    private String time;
    private String status;
    private String interviewType;
    private String feedback;
    private String scheduledById;
    private String scheduledByEmail;
    private String createdAt;
}

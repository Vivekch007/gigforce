package com.gigforce.interview.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescheduleInterviewRequestDTO {
    private java.time.LocalDate date;
    private String time;
}

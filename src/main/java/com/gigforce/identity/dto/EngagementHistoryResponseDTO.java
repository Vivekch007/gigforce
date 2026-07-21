package com.gigforce.identity.dto;

import com.gigforce.identity.enums.VerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EngagementHistoryResponseDTO {
    private String id;
    private String contractorProfileId;
    private String clientName;
    private String roleTitle;
    private LocalDate startDate;
    private LocalDate endDate;
    private String feedback;
    private Integer rating;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String verifyerName;
    private String verifyerEmail;
    private String verifyerPhone;
    private VerificationStatus status;
}

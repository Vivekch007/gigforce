package com.gigforce.analytics.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorReportRowDTO {
    private String contractorProfileId;
    private String userId;
    private String name;
    private String email;
    private Integer experienceYears;
    private String availabilityStatus;
    private String profileStatus;
}

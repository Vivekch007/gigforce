package com.gigforce.analytics.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceReportRowDTO {
    private String certificationId;
    private String contractorProfileId;
    private String contractorName;
    private String certificationName;
    private String issuingAuthority;
    private LocalDate expiryDate;
    private String certStatus;
}

package com.gigforce.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorProfileResponseDTO {
    private String id;
    private String userId;
    private String displayName;
    private String userName;
    private String userEmail;
    private BigDecimal hourlyRate;
    private Integer experienceYears;
    private String availabilityStatus;
    private String status;
    private List<ContractorSkillResponseDTO> skills;
    private String preferredEngagementType;
    private String phone;
    private String address;
    private Integer completionScore;
    private String orgUnitId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

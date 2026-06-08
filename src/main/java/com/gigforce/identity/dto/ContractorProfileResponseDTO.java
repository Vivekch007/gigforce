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
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long orgUnitId;
    private String orgUnitName;
    private String title;
    private String bio;
    private BigDecimal hourlyRate;
    private Integer experienceYears;
    private String status;
    private List<ContractorSkillResponseDTO> skills;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

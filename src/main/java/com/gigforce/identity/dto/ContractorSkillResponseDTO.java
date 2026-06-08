package com.gigforce.identity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorSkillResponseDTO {
    private Long skillId;
    private String skillName;
    private String skillCategory;
    private String proficiencyLevel;
    private Integer yearsOfExperience;
}

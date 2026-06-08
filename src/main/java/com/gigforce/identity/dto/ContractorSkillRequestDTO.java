package com.gigforce.identity.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ContractorSkillRequestDTO {

    @NotNull(message = "Skill ID is required")
    private Long skillId;

    @NotBlank(message = "Proficiency level is required")
    private String proficiencyLevel; // BEGINNER, INTERMEDIATE, EXPERT

    @NotNull(message = "Years of experience is required")
    @Min(value = 0, message = "Years of experience must be at least 0")
    private Integer yearsOfExperience;
}

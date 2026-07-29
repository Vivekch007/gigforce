package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillDistributionResponseDTO {
    @JsonProperty("Skill")
    private String skill;

    @JsonProperty("ContractorCount")
    private Long contractorCount;
}

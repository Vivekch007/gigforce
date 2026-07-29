package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillDashboardResponseDTO {
    @JsonProperty("Skill")
    private String skill;

    @JsonProperty("ContractorsBySkill")
    private Long contractorsBySkill;

    @JsonProperty("OpenDemandBySkill")
    private Long openDemandBySkill;

    @JsonProperty("FillRateBySkill")
    private BigDecimal fillRateBySkill;
}

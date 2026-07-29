package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessUnitDashboardResponseDTO {
    @JsonProperty("BusinessUnit")
    private String businessUnit;

    @JsonProperty("ActiveContractors")
    private Long activeContractors;

    @JsonProperty("TotalSpend")
    private BigDecimal totalSpend;

    @JsonProperty("OpenRequisitions")
    private Long openRequisitions;

    @JsonProperty("FilledRequisitions")
    private Long filledRequisitions;
}

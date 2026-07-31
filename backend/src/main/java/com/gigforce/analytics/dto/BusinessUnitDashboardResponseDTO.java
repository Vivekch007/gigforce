package com.gigforce.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessUnitDashboardResponseDTO {
    private String businessUnit;

    private Long activeContractors;

    private BigDecimal totalSpend;

    private Long openRequisitions;

    private Long filledRequisitions;
}

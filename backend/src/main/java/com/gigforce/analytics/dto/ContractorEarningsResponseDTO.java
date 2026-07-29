package com.gigforce.analytics.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorEarningsResponseDTO {
    private String month;
    private BigDecimal amountReceived;
    private LocalDate paymentDate;
    private String status;
}

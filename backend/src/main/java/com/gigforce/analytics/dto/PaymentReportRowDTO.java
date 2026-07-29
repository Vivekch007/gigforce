package com.gigforce.analytics.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentReportRowDTO {
    private String paymentId;
    private String invoiceId;
    private String invoiceNumber;
    private BigDecimal paidAmount;
    private LocalDate paymentDate;
    private String paymentMode;
    private String status;
}

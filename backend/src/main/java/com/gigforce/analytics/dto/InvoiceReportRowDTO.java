package com.gigforce.analytics.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceReportRowDTO {
    private String invoiceId;
    private String invoiceNumber;
    private String assignmentId;
    private String contractorName;
    private BigDecimal invoiceAmount;
    private String status;
    private LocalDate invoiceDate;
}

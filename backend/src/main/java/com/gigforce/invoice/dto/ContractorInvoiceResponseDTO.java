package com.gigforce.invoice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorInvoiceResponseDTO {
    private String id;
    private String poId;
    private String assignmentId;
    private String contractorId;
    private String contractorProfileId;
    private String vendorId;
    private String orgUnitId;
    private String invoiceNumber;
    private java.time.LocalDate invoiceDate;
    private java.time.LocalDate billingStartDate;
    private java.time.LocalDate billingEndDate;
    private String invoicePeriod;
    private BigDecimal hoursBilled;
    private BigDecimal invoiceAmount;
    private BigDecimal totalRegularHours;
    private BigDecimal totalOvertimeHours;
    private BigDecimal regularAmount;
    private BigDecimal overtimeAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private java.time.LocalDate paymentDate;
    private String paymentReference;
    private LocalDateTime submittedDate;
    private String status;
    private String contractorName;
    private String vendorName;
}


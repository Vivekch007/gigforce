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

    @JsonProperty("InvoiceID")
    @JsonAlias({"id", "invoiceId", "invoiceID"})
    private String id;

    @JsonProperty("POID")
    @JsonAlias({"poId", "poid", "poID"})
    private String poId;

    @JsonProperty("AssignmentID")
    @JsonAlias({"assignmentId", "assignmentID"})
    private String assignmentId;

    @JsonProperty("ContractorID")
    @JsonAlias({"contractorId", "contractorID"})
    private String contractorId;

    @JsonProperty("InvoicePeriod")
    @JsonAlias({"invoicePeriod", "invoice_period"})
    private String invoicePeriod;

    @JsonProperty("HoursBilled")
    @JsonAlias({"hoursBilled", "hours_billed"})
    private BigDecimal hoursBilled;

    @JsonProperty("InvoiceAmount")
    @JsonAlias({"invoiceAmount", "invoice_amount"})
    private BigDecimal invoiceAmount;

    @JsonProperty("SubmittedDate")
    @JsonAlias({"submittedDate", "submitted_date"})
    private LocalDateTime submittedDate;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;
}

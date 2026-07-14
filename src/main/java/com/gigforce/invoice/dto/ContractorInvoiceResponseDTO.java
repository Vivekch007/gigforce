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

    @JsonProperty("ContractorProfileID")
    @JsonAlias({"contractorProfileId", "contractorProfileID"})
    private String contractorProfileId;

    @JsonProperty("VendorID")
    @JsonAlias({"vendorId", "vendorID"})
    private String vendorId;

    @JsonProperty("OrgUnitID")
    @JsonAlias({"orgUnitId", "orgUnitID"})
    private String orgUnitId;

    @JsonProperty("InvoiceNumber")
    @JsonAlias({"invoiceNumber"})
    private String invoiceNumber;

    @JsonProperty("InvoiceDate")
    @JsonAlias({"invoiceDate"})
    private java.time.LocalDate invoiceDate;

    @JsonProperty("BillingStartDate")
    @JsonAlias({"billingStartDate", "billing_start_date"})
    private java.time.LocalDate billingStartDate;

    @JsonProperty("BillingEndDate")
    @JsonAlias({"billingEndDate", "billing_end_date"})
    private java.time.LocalDate billingEndDate;

    @JsonProperty("InvoicePeriod")
    @JsonAlias({"invoicePeriod", "invoice_period"})
    private String invoicePeriod;

    @JsonProperty("HoursBilled")
    @JsonAlias({"hoursBilled", "hours_billed"})
    private BigDecimal hoursBilled;

    @JsonProperty("InvoiceAmount")
    @JsonAlias({"invoiceAmount", "invoice_amount"})
    private BigDecimal invoiceAmount;

    @JsonProperty("TotalRegularHours")
    @JsonAlias({"totalRegularHours"})
    private BigDecimal totalRegularHours;

    @JsonProperty("TotalOvertimeHours")
    @JsonAlias({"totalOvertimeHours"})
    private BigDecimal totalOvertimeHours;

    @JsonProperty("RegularAmount")
    @JsonAlias({"regularAmount"})
    private BigDecimal regularAmount;

    @JsonProperty("OvertimeAmount")
    @JsonAlias({"overtimeAmount"})
    private BigDecimal overtimeAmount;

    @JsonProperty("TaxAmount")
    @JsonAlias({"taxAmount"})
    private BigDecimal taxAmount;

    @JsonProperty("TotalAmount")
    @JsonAlias({"totalAmount"})
    private BigDecimal totalAmount;

    @JsonProperty("PaymentDate")
    @JsonAlias({"paymentDate"})
    private java.time.LocalDate paymentDate;

    @JsonProperty("PaymentReference")
    @JsonAlias({"paymentReference"})
    private String paymentReference;

    @JsonProperty("SubmittedDate")
    @JsonAlias({"submittedDate", "submitted_date"})
    private LocalDateTime submittedDate;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;
}

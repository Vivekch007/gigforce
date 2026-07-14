package com.gigforce.invoice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorInvoiceRequestDTO {

    @JsonProperty("POID")
    @JsonAlias({"poId", "poid", "poID"})
    private String poId;

    @JsonProperty("AssignmentID")
    @JsonAlias({"assignmentId", "assignmentID"})
    @NotBlank(message = "AssignmentID is required")
    private String assignmentId;

    @JsonProperty("ContractorID")
    @JsonAlias({"contractorId", "contractorID"})
    @NotBlank(message = "ContractorID is required")
    private String contractorId;

    @JsonProperty("InvoicePeriod")
    @JsonAlias({"invoicePeriod", "invoice_period"})
    @NotBlank(message = "InvoicePeriod is required")
    private String invoicePeriod;

    @JsonProperty("TimesheetIDs")
    @JsonAlias({"timesheetIds", "timesheetIDs"})
    private List<String> timesheetIds;

    @JsonProperty("BillingStartDate")
    @JsonAlias({"billingStartDate", "billing_start_date"})
    private java.time.LocalDate billingStartDate;

    @JsonProperty("BillingEndDate")
    @JsonAlias({"billingEndDate", "billing_end_date"})
    private java.time.LocalDate billingEndDate;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;
}

package com.gigforce.invoice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorInvoiceRequestDTO {

    @JsonProperty("AssignmentID")
    @JsonAlias({"assignmentId", "assignmentID"})
    @NotBlank(message = "AssignmentID is required")
    private String assignmentId;

    @JsonProperty("InvoicePeriod")
    @JsonAlias({"invoicePeriod", "invoice_period"})
    @NotBlank(message = "InvoicePeriod is required")
    private String invoicePeriod;

    @JsonProperty("TimesheetIDs")
    @JsonAlias({"timesheetIds", "timesheetIDs"})
    private List<String> timesheetIds;

    @JsonProperty("BillingStartDate")
    @JsonAlias({"billingStartDate", "billing_start_date"})
    @NotNull(message = "BillingStartDate is required")
    private java.time.LocalDate billingStartDate;

    @JsonProperty("BillingEndDate")
    @JsonAlias({"billingEndDate", "billing_end_date"})
    @NotNull(message = "BillingEndDate is required")
    private java.time.LocalDate billingEndDate;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;
}



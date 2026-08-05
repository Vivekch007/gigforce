package com.gigforce.invoice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderResponseDTO {

    @JsonProperty("POID")
    @JsonAlias({"id", "poId", "poid"})
    private String id;

    @JsonProperty("AssignmentID")
    @JsonAlias({"assignmentId", "assignmentID"})
    private String assignmentId;

    @JsonProperty("VendorID")
    @JsonAlias({"vendorId", "vendorID"})
    private String vendorId;

    private String vendorName;

    private String contractorName;

    @JsonProperty("POAmount")
    @JsonAlias({"poAmount", "po_amount"})
    private BigDecimal poAmount;

    @JsonProperty("BalanceAmount")
    @JsonAlias({"balanceAmount", "balance_amount"})
    private BigDecimal balanceAmount;

    @JsonProperty("Currency")
    @JsonAlias({"currency"})
    private String currency;

    @JsonProperty("IssuedDate")
    @JsonAlias({"issuedDate", "issued_date"})
    private LocalDate issuedDate;

    @JsonProperty("ExpiryDate")
    @JsonAlias({"expiryDate", "expiry_date"})
    private LocalDate expiryDate;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;

    // Assignment-related fields
    private LocalDate startDate;
    private LocalDate endDate;
    
    @JsonProperty("OrganizationID")
    @JsonAlias({"orgUnitId", "organizationId", "businessUnitId", "clientName"})
    private String orgUnitId;

    @JsonProperty("ApprovedByHRUserID")
    @JsonAlias({"hiringManagerId", "approvedByHRUserId", "hrUserId"})
    private String hiringManagerId;

    @JsonProperty("ApprovedByHRUserName")
    @JsonAlias({"hiringManagerName", "approvedByHRUserName"})
    private String hiringManagerName;
}

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

    @JsonProperty("POAmount")
    @JsonAlias({"poAmount", "po_amount"})
    private BigDecimal poAmount;

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
}

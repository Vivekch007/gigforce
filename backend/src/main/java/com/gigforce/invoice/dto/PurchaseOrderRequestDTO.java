package com.gigforce.invoice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderRequestDTO {

    @JsonProperty("AssignmentID")
    @JsonAlias({"assignmentId", "assignmentID"})
    @NotBlank(message = "AssignmentID is required")
    private String assignmentId;

    @JsonProperty("VendorID")
    @JsonAlias({"vendorId", "vendorID"})
    @NotBlank(message = "VendorID is required")
    private String vendorId;

    @JsonProperty("POAmount")
    @JsonAlias({"poAmount", "po_amount"})
    @NotNull(message = "POAmount is required")
    @Positive(message = "POAmount must be positive")
    private BigDecimal poAmount;

    @JsonProperty("Currency")
    @JsonAlias({"currency"})
    @NotBlank(message = "Currency is required")
    private String currency;

//    @JsonProperty("IssuedDate")
//    @JsonAlias({"issuedDate", "issued_date"})
//    @NotNull(message = "IssuedDate is required")
//    private LocalDate issuedDate;
//
//    @JsonProperty("ExpiryDate")
//    @JsonAlias({"expiryDate", "expiry_date"})
//    @NotNull(message = "ExpiryDate is required")
//    private LocalDate expiryDate;
//
//    @JsonProperty("Status")
//    @JsonAlias({"status"})
//    private String status;
}

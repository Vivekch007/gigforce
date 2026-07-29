package com.gigforce.invoice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for updating payment records (PUT operation).
 * Allows updating payment details like amount, date, mode, and optional reference.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentUpdateRequestDTO {

    @JsonProperty("PaidAmount")
    @JsonAlias({"paidAmount", "paid_amount"})
    @Positive(message = "PaidAmount must be positive")
    private BigDecimal paidAmount;

    @JsonProperty("PaymentDate")
    @JsonAlias({"paymentDate", "payment_date"})
    private LocalDate paymentDate;

    @JsonProperty("PaymentMode")
    @JsonAlias({"paymentMode", "payment_mode"})
    private String paymentMode;

    @JsonProperty("PaymentReference")
    @JsonAlias({"paymentReference", "payment_reference"})
    private String paymentReference;

    // NOTE: The following fields are NOT modifiable and ignored in PUT operations:
    // - invoiceId: immutable - established at creation time
    // - status: managed through dedicated endpoints (processPayment, failPayment)
    // - transactionId: auto-generated and immutable
}


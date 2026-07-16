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
public class PaymentRequestDTO {

    @JsonProperty("InvoiceID")
    @JsonAlias({"invoiceId", "invoiceID"})
    @NotBlank(message = "InvoiceID is required")
    private String invoiceId;

    @JsonProperty("PaidAmount")
    @JsonAlias({"paidAmount", "paid_amount"})
    @NotNull(message = "PaidAmount is required")
    @Positive(message = "PaidAmount must be positive")
    private BigDecimal paidAmount;

    @JsonProperty("PaymentDate")
    @JsonAlias({"paymentDate", "payment_date"})
    @NotNull(message = "PaymentDate is required")
    private LocalDate paymentDate;

    @JsonProperty("PaymentMode")
    @JsonAlias({"paymentMode", "payment_mode"})
    @NotBlank(message = "PaymentMode is required")
    private String paymentMode;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;

    @JsonProperty("PaymentReference")
    @JsonAlias({"paymentReference", "payment_reference"})
    @NotBlank(message = "PaymentReference is required")
    private String paymentReference;

    @JsonProperty("TransactionID")
    @JsonAlias({"transactionId", "transactionID"})
    @NotBlank(message = "TransactionID is required")
    private String transactionId;
}

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
public class PaymentResponseDTO {

    @JsonProperty("PaymentID")
    @JsonAlias({"id", "paymentId", "paymentID"})
    private String id;

    @JsonProperty("InvoiceID")
    @JsonAlias({"invoiceId", "invoiceID"})
    private String invoiceId;

    @JsonProperty("PaidAmount")
    @JsonAlias({"paidAmount", "paid_amount"})
    private BigDecimal paidAmount;

    @JsonProperty("PaymentDate")
    @JsonAlias({"paymentDate", "payment_date"})
    private LocalDate paymentDate;

    @JsonProperty("PaymentMode")
    @JsonAlias({"paymentMode", "payment_mode"})
    private String paymentMode;

    @JsonProperty("Status")
    @JsonAlias({"status"})
    private String status;

    @JsonProperty("PaymentReference")
    @JsonAlias({"paymentReference"})
    private String paymentReference;

    @JsonProperty("TransactionID")
    @JsonAlias({"transactionId"})
    private String transactionId;
}

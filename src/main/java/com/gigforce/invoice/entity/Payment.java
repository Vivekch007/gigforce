package com.gigforce.invoice.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.invoice.enums.PaymentMode;
import com.gigforce.invoice.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
    name = "payments",
    indexes = {
        @Index(name = "idx_payment_invoice", columnList = "InvoiceID"),
        @Index(name = "idx_payment_status", columnList = "Status")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "PaymentID", length = 64))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "InvoiceID", nullable = false)
    private ContractorInvoice invoice;

    @Column(name = "PaidAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "PaymentDate", nullable = false)
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "PaymentMode", nullable = false, length = 30)
    private PaymentMode paymentMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status", nullable = false, length = 30)
    private PaymentStatus status;

    @Column(name = "PaymentReference", length = 150)
    private String paymentReference;

    @Column(name = "TransactionID", length = 150)
    private String transactionId;

    // Aliases to exactly match PDF field names in Java reflections/serialization if checked
    public String getPaymentID() {
        return getId();
    }

    public void setPaymentID(String paymentId) {
        setId(paymentId);
    }

    public String getInvoiceID() {
        return invoice != null ? invoice.getId() : null;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public PaymentMode getPaymentMode() {
        return paymentMode;
    }

    public void setPaymentMode(PaymentMode paymentMode) {
        this.paymentMode = paymentMode;
    }
}

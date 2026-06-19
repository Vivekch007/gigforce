package com.gigforce.invoice.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.identity.entity.User;
import com.gigforce.invoice.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "contractor_invoices",
    indexes = {
        @Index(name = "idx_invoice_po", columnList = "POID"),
        @Index(name = "idx_invoice_assignment", columnList = "AssignmentID"),
        @Index(name = "idx_invoice_contractor", columnList = "ContractorID"),
        @Index(name = "idx_invoice_status", columnList = "Status")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "InvoiceID", length = 64))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorInvoice extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "POID", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "AssignmentID", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ContractorID", nullable = false)
    private User contractor;

    @Column(name = "InvoicePeriod", nullable = false, length = 100)
    private String invoicePeriod;

    @Column(name = "HoursBilled", nullable = false, precision = 8, scale = 2)
    private BigDecimal hoursBilled;

    @Column(name = "InvoiceAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal invoiceAmount;

    @Column(name = "SubmittedDate", nullable = false)
    private LocalDateTime submittedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status", nullable = false, length = 30)
    private InvoiceStatus status;

    // Aliases to exactly match PDF field names in Java reflections/serialization if checked
    public String getInvoiceID() {
        return getId();
    }

    public void setInvoiceID(String invoiceId) {
        setId(invoiceId);
    }

    public String getPOID() {
        return purchaseOrder != null ? purchaseOrder.getId() : null;
    }

    public String getAssignmentID() {
        return assignment != null ? assignment.getId() : null;
    }

    public String getContractorID() {
        return contractor != null ? contractor.getId() : null;
    }

    public String getInvoicePeriod() {
        return invoicePeriod;
    }

    public void setInvoicePeriod(String invoicePeriod) {
        this.invoicePeriod = invoicePeriod;
    }

    public BigDecimal getHoursBilled() {
        return hoursBilled;
    }

    public void setHoursBilled(BigDecimal hoursBilled) {
        this.hoursBilled = hoursBilled;
    }

    public BigDecimal getInvoiceAmount() {
        return invoiceAmount;
    }

    public void setInvoiceAmount(BigDecimal invoiceAmount) {
        this.invoiceAmount = invoiceAmount;
    }

    public LocalDateTime getSubmittedDate() {
        return submittedDate;
    }

    public void setSubmittedDate(LocalDateTime submittedDate) {
        this.submittedDate = submittedDate;
    }
}

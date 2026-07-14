package com.gigforce.invoice.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.identity.entity.User;
import com.gigforce.invoice.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.*;

import com.gigforce.identity.entity.ContractorProfile;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(
    name = "contractor_invoices",
    indexes = {
        @Index(name = "idx_invoice_po", columnList = "POID"),
        @Index(name = "idx_invoice_assignment", columnList = "AssignmentID"),
        @Index(name = "idx_invoice_contractor", columnList = "ContractorID"),
        @Index(name = "idx_invoice_status", columnList = "Status"),
        @Index(name = "idx_invoice_org_unit", columnList = "OrgUnitID")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "InvoiceID", length = 64))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorInvoice extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "POID")
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "AssignmentID", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ContractorID", nullable = false)
    private User contractor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "VendorID")
    private User vendor;

    @Column(name = "OrgUnitID", length = 64)
    private String orgUnitId;

    @Column(name = "InvoiceNumber", nullable = false, unique = true, length = 64)
    private String invoiceNumber;

    @Column(name = "InvoiceDate", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "BillingStartDate", nullable = false)
    private LocalDate billingStartDate;

    @Column(name = "BillingEndDate", nullable = false)
    private LocalDate billingEndDate;

    @Column(name = "InvoicePeriod", nullable = false, length = 100)
    private String invoicePeriod;

    @Column(name = "HoursBilled", nullable = false, precision = 8, scale = 2)
    private BigDecimal hoursBilled;

    @Column(name = "InvoiceAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal invoiceAmount;

    @Column(name = "TotalRegularHours", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalRegularHours;

    @Column(name = "TotalOvertimeHours", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalOvertimeHours;

    @Column(name = "RegularAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal regularAmount;

    @Column(name = "OvertimeAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal overtimeAmount;

    @Column(name = "TaxAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "TotalAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "PaymentDate")
    private LocalDate paymentDate;

    @Column(name = "PaymentReference", length = 150)
    private String paymentReference;

    @Column(name = "SubmittedDate")
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

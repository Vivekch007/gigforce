package com.gigforce.invoice.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.identity.entity.User;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
    name = "purchase_orders",
    indexes = {
        @Index(name = "idx_po_assignment", columnList = "AssignmentID"),
        @Index(name = "idx_po_vendor", columnList = "VendorID"),
        @Index(name = "idx_po_status", columnList = "Status")
    }
)
@AttributeOverride(name = "id", column = @Column(name = "POID", length = 64))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "AssignmentID", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "VendorID", nullable = false)
    private User vendor;

    @Column(name = "POAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal poAmount;

    @Column(name = "Currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "IssuedDate", nullable = false)
    private LocalDate issuedDate;

    @Column(name = "ExpiryDate", nullable = false)
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "Status", nullable = false, length = 30)
    private PurchaseOrderStatus status;

    // Aliases to exactly match PDF field names in Java reflections/serialization if checked
    public String getPOID() {
        return getId();
    }

    public void setPOID(String poid) {
        setId(poid);
    }

    public String getAssignmentID() {
        return assignment != null ? assignment.getId() : null;
    }

    public String getVendorID() {
        return vendor != null ? vendor.getId() : null;
    }

    public BigDecimal getPOAmount() {
        return poAmount;
    }

    public void setPOAmount(BigDecimal poAmount) {
        this.poAmount = poAmount;
    }

    public BigDecimal getPoAmount() {
        return poAmount;
    }

    public void setPoAmount(BigDecimal poAmount) {
        this.poAmount = poAmount;
    }

    public LocalDate getIssuedDate() {
        return issuedDate;
    }

    public void setIssuedDate(LocalDate issuedDate) {
        this.issuedDate = issuedDate;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }
}

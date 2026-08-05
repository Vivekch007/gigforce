package com.gigforce.invoice.repository;

import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractorInvoiceRepository extends JpaRepository<ContractorInvoice, String>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<ContractorInvoice> {

    List<ContractorInvoice> findByAssignmentId(String assignmentId);

    List<ContractorInvoice> findByContractorId(String contractorId);

    List<ContractorInvoice> findByPurchaseOrderId(String purchaseOrderId);

    List<ContractorInvoice> findByStatus(InvoiceStatus status);

    @Query("SELECT ci FROM ContractorInvoice ci WHERE ci.purchaseOrder.id = :poId AND ci.status <> 'REJECTED' AND ci.status <> 'CANCELLED'")
    List<ContractorInvoice> findActiveInvoicesByPurchaseOrderId(@Param("poId") String poId);

    boolean existsByAssignmentIdAndBillingStartDateAndBillingEndDateAndStatusNot(
            String assignmentId,
            java.time.LocalDate billingStartDate,
            java.time.LocalDate billingEndDate,
            InvoiceStatus status);

    @Query("SELECT COUNT(ci) > 0 FROM ContractorInvoice ci WHERE ci.assignment.id = :assignmentId " +
            "AND ci.billingStartDate = :billingStartDate AND ci.billingEndDate = :billingEndDate " +
            "AND ci.status <> 'REJECTED' AND ci.status <> 'CANCELLED'")
    boolean existsActiveInvoiceForAssignmentAndBillingPeriod(
            @Param("assignmentId") String assignmentId,
            @Param("billingStartDate") java.time.LocalDate billingStartDate,
            @Param("billingEndDate") java.time.LocalDate billingEndDate);
}

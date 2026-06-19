package com.gigforce.invoice.repository;

import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractorInvoiceRepository extends JpaRepository<ContractorInvoice, String> {

    List<ContractorInvoice> findByAssignmentId(String assignmentId);

    List<ContractorInvoice> findByContractorId(String contractorId);

    List<ContractorInvoice> findByPurchaseOrderId(String purchaseOrderId);

    List<ContractorInvoice> findByStatus(InvoiceStatus status);

    @Query("SELECT ci FROM ContractorInvoice ci WHERE ci.purchaseOrder.id = :poId AND ci.status <> 'REJECTED'")
    List<ContractorInvoice> findActiveInvoicesByPurchaseOrderId(@Param("poId") String poId);
}

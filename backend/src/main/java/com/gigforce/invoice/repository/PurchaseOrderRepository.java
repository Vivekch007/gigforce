package com.gigforce.invoice.repository;

import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {

    List<PurchaseOrder> findByAssignmentId(String assignmentId);

    List<PurchaseOrder> findByVendorId(String vendorId);

    List<PurchaseOrder> findByStatus(PurchaseOrderStatus status);

    @Query("SELECT p FROM PurchaseOrder p WHERE p.assignment.id = :assignmentId AND p.status = :status")
    List<PurchaseOrder> findByAssignmentIdAndStatus(@Param("assignmentId") String assignmentId, @Param("status") PurchaseOrderStatus status);
}

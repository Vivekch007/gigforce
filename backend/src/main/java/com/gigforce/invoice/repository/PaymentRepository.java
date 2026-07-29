package com.gigforce.invoice.repository;

import com.gigforce.invoice.entity.Payment;
import com.gigforce.invoice.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {

    List<Payment> findByInvoiceId(String invoiceId);

    List<Payment> findByStatus(PaymentStatus status);
}

package com.gigforce.invoice.service;

import com.gigforce.identity.entity.User;
import com.gigforce.invoice.dto.PaymentRequestDTO;
import com.gigforce.invoice.dto.PaymentResponseDTO;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.Payment;
import com.gigforce.invoice.enums.InvoiceStatus;
import com.gigforce.invoice.enums.PaymentMode;
import com.gigforce.invoice.enums.PaymentStatus;
import com.gigforce.invoice.repository.ContractorInvoiceRepository;
import com.gigforce.invoice.repository.PaymentRepository;
import com.gigforce.security.CurrentUserContext;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.audit.service.AuditService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import com.gigforce.notification.publisher.NotificationPublisher;

@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final ContractorInvoiceRepository contractorInvoiceRepository;
    private final CurrentUserContext currentUserContext;
    private final AuditService auditService;
    private final NotificationPublisher notificationPublisher;

    public PaymentServiceImpl(
            PaymentRepository paymentRepository,
            ContractorInvoiceRepository contractorInvoiceRepository,
            CurrentUserContext currentUserContext,
            AuditService auditService,
            NotificationPublisher notificationPublisher) {
        this.paymentRepository = paymentRepository;
        this.contractorInvoiceRepository = contractorInvoiceRepository;
        this.currentUserContext = currentUserContext;
        this.auditService = auditService;
        this.notificationPublisher = notificationPublisher;
    }

    @Override
    @Transactional
    public PaymentResponseDTO createPayment(PaymentRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: ADMIN, FINANCE allowed to create payments
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to create payments.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(request.getInvoiceId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + request.getInvoiceId()));

        // Check if invoice is in APPROVED state
        if (invoice.getStatus() != InvoiceStatus.APPROVED) {
            throw new BusinessValidationException("Cannot process payment against invoice in status " + invoice.getStatus() + ". Invoice must be APPROVED first.");
        }

        if (request.getPaymentReference() == null || request.getPaymentReference().trim().isEmpty()) {
            throw new BusinessValidationException("Payment reference is required.");
        }

        if (request.getPaymentDate() == null) {
            throw new BusinessValidationException("Payment date is required.");
        }

        if (request.getPaymentDate().isAfter(LocalDate.now())) {
            throw new BusinessValidationException("Payment date cannot be in the future.");
        }

        PaymentMode mode;
        try {
            mode = PaymentMode.valueOf(request.getPaymentMode().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid PaymentMode: " + request.getPaymentMode());
        }

        PaymentStatus initialStatus = PaymentStatus.PENDING;
        if (request.getStatus() != null) {
            try {
                initialStatus = PaymentStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid PaymentStatus: " + request.getStatus());
            }
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .paidAmount(request.getPaidAmount())
                .paymentDate(request.getPaymentDate())
                .paymentMode(mode)
                .status(initialStatus)
                .paymentReference(request.getPaymentReference())
                .transactionId(request.getTransactionId())
                .build();

        payment = paymentRepository.save(payment);

        auditService.logAction(
                currentUser.getId(),
                "PAYMENT_CREATED",
                "Payment",
                payment.getId(),
                "Payment entry created."
        );

        // Cascade invoice PAID status automatically if the payment is processed successfully right away
        if (payment.getStatus() == PaymentStatus.PROCESSED) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaymentDate(payment.getPaymentDate());
            invoice.setPaymentReference(payment.getPaymentReference());
            contractorInvoiceRepository.save(invoice);

            auditService.logAction(
                    currentUser.getId(),
                    "INVOICE_PAID",
                    "ContractorInvoice",
                    invoice.getId(),
                    "Invoice marked as PAID."
            );

            notificationPublisher.publishPaymentCompletion(payment);
        }

        return mapToDto(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponseDTO getPaymentById(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with ID: " + id));

        validateViewAccess(payment, currentUser);

        return mapToDto(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getAllPayments() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        List<Payment> allPayments = paymentRepository.findAll();

        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return allPayments.stream().map(this::mapToDto).collect(Collectors.toList());
        }

        if ("HIRING_MANAGER".equals(role)) {
            return allPayments.stream()
                    .filter(pay -> pay.getInvoice().getAssignment().getHiringManager().getId().equals(currentUser.getId()))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            return allPayments.stream()
                    .filter(pay -> (pay.getInvoice().getAssignment().getVendor() != null && pay.getInvoice().getAssignment().getVendor().getId().equals(currentUser.getId())) ||
                                   (pay.getInvoice().getPurchaseOrder() != null && pay.getInvoice().getPurchaseOrder().getVendor().getId().equals(currentUser.getId())))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        // Contractors: NO ACCESS
        throw new AccessDeniedException("Access Denied: You do not have permissions to view Payments.");
    }

    @Override
    @Transactional
    public PaymentResponseDTO processPayment(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to process payments.");
        }

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with ID: " + id));

        // Workflow validation: only PENDING payments can be processed or failed
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new BusinessValidationException("Invalid workflow transition: Cannot process payment in status " + payment.getStatus());
        }

        if (payment.getPaymentReference() == null || payment.getPaymentReference().trim().isEmpty()) {
            throw new BusinessValidationException("Payment reference is required to process payment.");
        }

        payment.setStatus(PaymentStatus.PROCESSED);
        payment = paymentRepository.save(payment);

        auditService.logAction(
                currentUser.getId(),
                "PAYMENT_UPDATED",
                "Payment",
                payment.getId(),
                "Payment processed successfully."
        );

        // Automatically update the associated invoice to PAID status
        ContractorInvoice invoice = payment.getInvoice();
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaymentDate(payment.getPaymentDate());
        invoice.setPaymentReference(payment.getPaymentReference());
        contractorInvoiceRepository.save(invoice);

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_PAID",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice marked as PAID."
        );

        notificationPublisher.publishPaymentCompletion(payment);

        return mapToDto(payment);
    }

    @Override
    @Transactional
    public PaymentResponseDTO failPayment(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to fail payments.");
        }

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with ID: " + id));

        // Workflow validation: only PENDING payments can be processed or failed
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new BusinessValidationException("Invalid workflow transition: Cannot fail payment in status " + payment.getStatus());
        }

        payment.setStatus(PaymentStatus.FAILED);
        payment = paymentRepository.save(payment);

        auditService.logAction(
                currentUser.getId(),
                "PAYMENT_UPDATED",
                "Payment",
                payment.getId(),
                "Payment failed."
        );

        return mapToDto(payment);
    }

    private void validateViewAccess(Payment payment, User currentUser) {
        String role = currentUser.getRole().name();
        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return;
        }

        if ("HIRING_MANAGER".equals(role)) {
            if (payment.getInvoice().getAssignment().getHiringManager().getId().equals(currentUser.getId())) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view payments associated with assignments you manage.");
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            if ((payment.getInvoice().getAssignment().getVendor() != null && payment.getInvoice().getAssignment().getVendor().getId().equals(currentUser.getId())) ||
                    (payment.getInvoice().getPurchaseOrder() != null && payment.getInvoice().getPurchaseOrder().getVendor().getId().equals(currentUser.getId()))) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view payments associated with your Vendor profile.");
        }

        throw new AccessDeniedException("Access Denied: You do not have permissions to view this Payment.");
    }

    private PaymentResponseDTO mapToDto(Payment payment) {
        return PaymentResponseDTO.builder()
                .id(payment.getId())
                .invoiceId(payment.getInvoice().getId())
                .paidAmount(payment.getPaidAmount())
                .paymentDate(payment.getPaymentDate())
                .paymentMode(payment.getPaymentMode().name())
                .paymentReference(payment.getPaymentReference())
                .transactionId(payment.getTransactionId())
                .status(payment.getStatus().name())
                .build();
    }
}

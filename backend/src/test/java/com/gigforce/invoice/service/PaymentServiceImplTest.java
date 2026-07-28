package com.gigforce.invoice.service;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.invoice.dto.PaymentCreateRequestDTO;
import com.gigforce.invoice.dto.PaymentResponseDTO;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.Payment;
import com.gigforce.invoice.enums.InvoiceStatus;
import com.gigforce.invoice.enums.PaymentMode;
import com.gigforce.invoice.enums.PaymentStatus;
import com.gigforce.invoice.repository.ContractorInvoiceRepository;
import com.gigforce.invoice.repository.PaymentRepository;
import com.gigforce.notification.publisher.NotificationPublisher;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 6 - Payment service tests.
 * Covers the amount-match / transaction-id / positive-amount validations,
 * the two-step PENDING -> PROCESSED -> invoice PAID flow, and RBAC.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaymentServiceImplTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private ContractorInvoiceRepository contractorInvoiceRepository;
    @Mock private CurrentUserContext currentUserContext;
    @Mock private AuditService auditService;
    @Mock private NotificationPublisher notificationPublisher;
    @Mock private com.gigforce.common.id.IdSequenceRepository idSequenceRepository;

    @InjectMocks private PaymentServiceImpl service;

    private static final BigDecimal TOTAL = new BigDecimal("5375.00");

    private User finance;
    private User riya;
    private User arjun;
    private ContractorProfile p1;
    private User sam;
    private Assignment assignment;

    @BeforeEach
    void setUp() {
        finance = user("f1", "fin@x.com", UserRole.FINANCE);
        riya = user("hr1", "riya@x.com", UserRole.HIRING_MANAGER);
        arjun = user("cu1", "arjun@x.com", UserRole.CONTRACTOR);
        p1 = profile("p1", arjun);
        sam = user("v1", "sam@x.com", UserRole.VENDOR);
        assignment = assignment("a1", riya, sam, p1);
    }

    // ---------------- helpers ----------------

    private User user(String id, String email, UserRole role) {
        User u = User.builder().name("N-" + id).email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).orgUnitId("ORG1").build();
        u.setId(id);
        return u;
    }

    private ContractorProfile profile(String id, User u) {
        ContractorProfile p = ContractorProfile.builder().user(u)
                .availabilityStatus(AvailabilityStatus.ON_ASSIGNMENT).profileStatus(ProfileStatus.ACTIVE).build();
        p.setId(id);
        return p;
    }

    private Assignment assignment(String id, User hm, User vendor, ContractorProfile p) {
        Assignment a = Assignment.builder()
                .contractorProfile(p).hiringManager(hm).vendor(vendor).status(AssignmentStatus.ACTIVE)
                .startDate(LocalDate.of(2026, 8, 1)).endDate(LocalDate.of(2027, 2, 1))
                .agreedRatePerDay(new BigDecimal("1000.00"))
                .engagementType(EngagementType.REMOTE).orgUnitId("ORG1").build();
        a.setId(id);
        return a;
    }

    private ContractorInvoice invoice(String id, InvoiceStatus status) {
        ContractorInvoice inv = ContractorInvoice.builder()
                .assignment(assignment).contractor(arjun).contractorProfile(p1).vendor(sam)
                .orgUnitId("ORG1").invoiceNumber("INV-2026-000001").invoiceDate(LocalDate.now())
                .billingStartDate(LocalDate.of(2026, 8, 3)).billingEndDate(LocalDate.of(2026, 8, 9))
                .invoicePeriod("2026-08").hoursBilled(new BigDecimal("42.00")).invoiceAmount(TOTAL)
                .totalRegularHours(new BigDecimal("40.00")).totalOvertimeHours(new BigDecimal("2.00"))
                .regularAmount(new BigDecimal("5000.00")).overtimeAmount(new BigDecimal("375.00"))
                .taxAmount(BigDecimal.ZERO).totalAmount(TOTAL).status(status).build();
        inv.setId(id);
        return inv;
    }

    private Payment payment(String id, ContractorInvoice inv, PaymentStatus status) {
        Payment p = Payment.builder()
                .invoice(inv).paidAmount(TOTAL).paymentDate(LocalDate.now()).paymentMode(PaymentMode.BANK_TRANSFER)
                .status(status).transactionId("TXN-1").build();
        p.setId(id);
        return p;
    }

    private PaymentCreateRequestDTO req(BigDecimal amount, LocalDate date, String ref, String txn, String mode) {
        return PaymentCreateRequestDTO.builder()
                .invoiceId("inv1").paidAmount(amount).paymentDate(date)
                .paymentMode(mode).build();
    }

    // ===================================================================
    // createPayment
    // ===================================================================

    @Test
    void createPayment_success_createsPending_noCascade() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            p.setId("pay1");
            return p;
        });

        PaymentResponseDTO res = service.createPayment(req(TOTAL, LocalDate.now(), "UTR-9", "TXN-9", "BANK_TRANSFER"));

        assertEquals(PaymentStatus.PENDING.name(), res.getStatus());
        assertEquals(InvoiceStatus.APPROVED, inv.getStatus()); // NOT auto-PAID
        verify(auditService).logAction(eq("f1"), eq("PAYMENT_CREATED"), eq("Payment"), eq("pay1"), anyString());
        verify(notificationPublisher, never()).publishPaymentCompletion(any());
    }

    @Test
    void createPayment_invoiceNotApproved_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.SUBMITTED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class,
                () -> service.createPayment(req(TOTAL, LocalDate.now(), "UTR-9", "TXN-9", "BANK_TRANSFER")));
    }

    @Test
    void createPayment_unauthorizedRole_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(riya); // HM cannot pay
        assertThrows(AccessDeniedException.class,
                () -> service.createPayment(req(TOTAL, LocalDate.now(), "UTR-9", "TXN-9", "BANK_TRANSFER")));
    }

    @Test
    void createPayment_amountDoesNotMatchInvoiceTotal_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class,
                () -> service.createPayment(req(new BigDecimal("5000.00"), LocalDate.now(), "UTR-9", "TXN-9", "BANK_TRANSFER")));
    }

    @Test
    void createPayment_nonPositiveAmount_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class,
                () -> service.createPayment(req(BigDecimal.ZERO, LocalDate.now(), "UTR-9", "TXN-9", "BANK_TRANSFER")));
    }

    @Test
    void createPayment_futurePaymentDate_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class,
                () -> service.createPayment(req(TOTAL, LocalDate.now().plusDays(1), "UTR-9", "TXN-9", "BANK_TRANSFER")));
    }

    @Test
    void createPayment_invalidPaymentMode_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(IllegalArgumentException.class,
                () -> service.createPayment(req(TOTAL, LocalDate.now(), "UTR-9", "TXN-9", "CRYPTO")));
    }

    // ===================================================================
    // processPayment
    // ===================================================================

    @Test
    void processPayment_pendingToProcessed_marksInvoicePaid() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        Payment pay = payment("pay1", inv, PaymentStatus.PENDING);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(paymentRepository.findById("pay1")).thenReturn(Optional.of(pay));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> i.getArgument(0));

        PaymentResponseDTO res = service.processPayment("pay1");

        assertEquals(PaymentStatus.PROCESSED.name(), res.getStatus());
        assertEquals(InvoiceStatus.PAID, inv.getStatus());
        assertEquals(pay.getPaymentDate(), inv.getPaymentDate());
        verify(auditService).logAction(eq("f1"), eq("PAYMENT_UPDATED"), eq("Payment"), eq("pay1"), anyString());
        verify(auditService).logAction(eq("f1"), eq("INVOICE_PAID"), eq("ContractorInvoice"), eq("inv1"), anyString());
        verify(notificationPublisher).publishPaymentCompletion(pay);
    }

    @Test
    void processPayment_notPending_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        Payment pay = payment("pay1", inv, PaymentStatus.PROCESSED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(paymentRepository.findById("pay1")).thenReturn(Optional.of(pay));
        assertThrows(BusinessValidationException.class, () -> service.processPayment("pay1"));
    }

    @Test
    void processPayment_unauthorized_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        assertThrows(AccessDeniedException.class, () -> service.processPayment("pay1"));
    }

    @Test
    void processPayment_missingTransactionId_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        Payment pay = payment("pay1", inv, PaymentStatus.PENDING);
        pay.setTransactionId(null);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(paymentRepository.findById("pay1")).thenReturn(Optional.of(pay));
        assertThrows(BusinessValidationException.class, () -> service.processPayment("pay1"));
    }

    // ===================================================================
    // failPayment
    // ===================================================================

    @Test
    void failPayment_pendingToFailed() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        Payment pay = payment("pay1", inv, PaymentStatus.PENDING);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(paymentRepository.findById("pay1")).thenReturn(Optional.of(pay));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));

        PaymentResponseDTO res = service.failPayment("pay1");

        assertEquals(PaymentStatus.FAILED.name(), res.getStatus());
        assertEquals(InvoiceStatus.APPROVED, inv.getStatus()); // invoice unchanged
    }

    @Test
    void failPayment_notPending_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED);
        Payment pay = payment("pay1", inv, PaymentStatus.PROCESSED);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(paymentRepository.findById("pay1")).thenReturn(Optional.of(pay));
        assertThrows(BusinessValidationException.class, () -> service.failPayment("pay1"));
    }

    // ===================================================================
    // view access
    // ===================================================================

    @Test
    void getAllPayments_contractor_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(arjun);
        assertThrows(AccessDeniedException.class, () -> service.getAllPayments());
    }

    @Test
    void getPaymentById_hiringManagerOwner_ok() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.PAID);
        Payment pay = payment("pay1", inv, PaymentStatus.PROCESSED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(paymentRepository.findById("pay1")).thenReturn(Optional.of(pay));
        assertEquals("pay1", service.getPaymentById("pay1").getId());
    }
}

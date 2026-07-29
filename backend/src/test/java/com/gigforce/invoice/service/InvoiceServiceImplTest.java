package com.gigforce.invoice.service;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.enums.PayrollStatus;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.repository.TimesheetRepository;
import com.gigforce.audit.service.AuditService;
import com.gigforce.common.id.IdSequenceRepository;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.invoice.dto.ContractorInvoiceRequestDTO;
import com.gigforce.invoice.dto.ContractorInvoiceResponseDTO;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.InvoiceStatus;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import com.gigforce.invoice.repository.ContractorInvoiceRepository;
import com.gigforce.invoice.repository.PurchaseOrderRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 6 - Contractor Invoice service tests.
 * Covers backend billing math, workflow state machine (single-HR/Finance flow, no DISPUTED),
 * duplicate/date/timesheet validations, PO balance controls and RBAC.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InvoiceServiceImplTest {

    @Mock private ContractorProfileRepository contractorProfileRepository;
    @Mock private ContractorInvoiceRepository contractorInvoiceRepository;
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private TimesheetRepository timesheetRepository;
    @Mock private UserRepository userRepository;
    @Mock private CurrentUserContext currentUserContext;
    @Mock private NotificationPublisher notificationPublisher;
    @Mock private IdSequenceRepository idSequenceRepository;
    @Mock private AuditService auditService;

    @InjectMocks private InvoiceServiceImpl service;

    private static final LocalDate A_START = LocalDate.of(2026, 8, 1);
    private static final LocalDate A_END = LocalDate.of(2027, 2, 1);
    private static final LocalDate BILL_START = LocalDate.of(2026, 8, 3);
    private static final LocalDate BILL_END = LocalDate.of(2026, 8, 9);

    private User arjun;    // contractor user
    private ContractorProfile p1;
    private User riya;     // HIRING_MANAGER (ORG1)
    private User finance;  // FINANCE
    private User sam;      // VENDOR
    private Assignment assignment;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "taxPercentage", 0.0);
        arjun = user("cu1", "arjun@x.com", UserRole.CONTRACTOR);
        p1 = profile("p1", arjun);
        riya = user("hr1", "riya@x.com", UserRole.HIRING_MANAGER);
        finance = user("f1", "fin@x.com", UserRole.FINANCE);
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
                .startDate(A_START).endDate(A_END)
                .agreedRatePerDay(new BigDecimal("1000.00"))
                .engagementType(EngagementType.REMOTE).orgUnitId("ORG1").build();
        a.setId(id);
        return a;
    }

    private Timesheet timesheet(String id, Assignment a, String reg, String ot, TimesheetStatus status) {
        Timesheet t = Timesheet.builder()
                .assignment(a).contractor(p1).weekStartDate(BILL_START).weekEndDate(BILL_END)
                .hoursLogged(new BigDecimal(reg)).overtimeLogged(new BigDecimal(ot))
                .status(status).payrollStatus(PayrollStatus.NOT_PROCESSED).orgUnitId("ORG1").build();
        t.setId(id);
        return t;
    }

    private ContractorInvoice invoice(String id, InvoiceStatus status, PurchaseOrder po) {
        ContractorInvoice inv = ContractorInvoice.builder()
                .purchaseOrder(po).assignment(assignment).contractor(arjun).contractorProfile(p1).vendor(sam)
                .orgUnitId("ORG1").invoiceNumber("INV-2026-000001").invoiceDate(LocalDate.now())
                .billingStartDate(BILL_START).billingEndDate(BILL_END).invoicePeriod("2026-08")
                .hoursBilled(new BigDecimal("40.00")).invoiceAmount(new BigDecimal("5000.00"))
                .totalRegularHours(new BigDecimal("40.00")).totalOvertimeHours(BigDecimal.ZERO)
                .regularAmount(new BigDecimal("5000.00")).overtimeAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO).totalAmount(new BigDecimal("5000.00")).status(status).build();
        inv.setId(id);
        return inv;
    }

    private ContractorInvoiceRequestDTO createReq(List<String> tsIds, String poId, String status) {
        return ContractorInvoiceRequestDTO.builder()
                .assignmentId("a1").contractorId("cu1").invoicePeriod("2026-08")
                .timesheetIds(tsIds).poId(poId).status(status)
                .billingStartDate(BILL_START).billingEndDate(BILL_END).build();
    }

    private void stubCreateBasics() {
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(contractorInvoiceRepository.existsByAssignmentIdAndBillingStartDateAndBillingEndDateAndStatusNot(
                eq("a1"), any(), any(), eq(InvoiceStatus.CANCELLED))).thenReturn(false);
        when(idSequenceRepository.findById(anyString())).thenReturn(Optional.empty());
        when(idSequenceRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> {
            ContractorInvoice inv = i.getArgument(0);
            if (inv.getId() == null) inv.setId("inv1");
            return inv;
        });
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
    }

    // ===================================================================
    // createInvoice - calculations & happy path
    // ===================================================================

    @Test
    void createInvoice_success_computesAmounts_submittedByDefault() {
        Timesheet ts = timesheet("ts1", assignment, "40", "2", TimesheetStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        stubCreateBasics();

        ContractorInvoiceResponseDTO res = service.createInvoice(createReq(List.of("ts1"), null, null));

        // 40 reg / 8 * 1000 = 5000 ; 2 OT / 8 * 1.5 * 1000 = 375 ; tax 0 -> total 5375
        assertEquals(0, new BigDecimal("5000.00").compareTo(res.getRegularAmount()));
        assertEquals(0, new BigDecimal("375.00").compareTo(res.getOvertimeAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(res.getTaxAmount()));
        assertEquals(0, new BigDecimal("5375.00").compareTo(res.getTotalAmount()));
        assertEquals(InvoiceStatus.SUBMITTED.name(), res.getStatus());
        verify(auditService).logAction(eq("hr1"), eq("INVOICE_CREATED"), eq("ContractorInvoice"), anyString(), anyString());
        verify(auditService).logAction(eq("hr1"), eq("INVOICE_SUBMITTED"), eq("ContractorInvoice"), anyString(), anyString());
        verify(notificationPublisher).publishInvoiceSubmission(any(ContractorInvoice.class));
    }

    @Test
    void createInvoice_appliesTaxPercentage() {
        ReflectionTestUtils.setField(service, "taxPercentage", 10.0);
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        stubCreateBasics();

        ContractorInvoiceResponseDTO res = service.createInvoice(createReq(List.of("ts1"), null, null));

        // subtotal 5000, tax 10% = 500, total 5500
        assertEquals(0, new BigDecimal("500.00").compareTo(res.getTaxAmount()));
        assertEquals(0, new BigDecimal("5500.00").compareTo(res.getTotalAmount()));
    }

    @Test
    void createInvoice_draftRequested_staysDraft_noSubmitAudit() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        stubCreateBasics();

        ContractorInvoiceResponseDTO res = service.createInvoice(createReq(List.of("ts1"), null, "DRAFT"));

        assertEquals(InvoiceStatus.DRAFT.name(), res.getStatus());
        assertNull(res.getSubmittedDate());
        verify(auditService, never()).logAction(anyString(), eq("INVOICE_SUBMITTED"), anyString(), anyString(), anyString());
    }

    // ===================================================================
    // createInvoice - validations
    // ===================================================================

    @Test
    void createInvoice_unauthorizedRole_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(sam); // VENDOR cannot create invoices
        assertThrows(AccessDeniedException.class, () -> service.createInvoice(createReq(List.of("ts1"), null, null)));
    }

    @Test
    void createInvoice_hiringManagerOutsideOrg_denied() {
        User hmOtherOrg = User.builder().name("N").email("hm2@x.com").password("h").phone("1234567890")
                .role(UserRole.HIRING_MANAGER).status(UserStatus.ACTIVE).orgUnitId("ORG2").build();
        hmOtherOrg.setId("hr2");
        when(currentUserContext.getCurrentUser()).thenReturn(hmOtherOrg);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment)); // ORG1
        assertThrows(AccessDeniedException.class, () -> service.createInvoice(createReq(List.of("ts1"), null, null)));
    }

    @Test
    void createInvoice_timesheetNotApproved_throws() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.SUBMITTED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        assertThrows(IllegalArgumentException.class, () -> service.createInvoice(createReq(List.of("ts1"), null, null)));
    }

    @Test
    void createInvoice_timesheetOtherAssignment_throws() {
        Assignment other = assignment("a2", riya, sam, p1);
        Timesheet ts = timesheet("ts1", other, "40", "0", TimesheetStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        assertThrows(IllegalArgumentException.class, () -> service.createInvoice(createReq(List.of("ts1"), null, null)));
    }

    @Test
    void createInvoice_timesheetAlreadyInvoiced_throws() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        ts.setInvoice(invoice("old", InvoiceStatus.SUBMITTED, null));
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        assertThrows(IllegalArgumentException.class, () -> service.createInvoice(createReq(List.of("ts1"), null, null)));
    }

    @Test
    void createInvoice_noApprovedUninvoicedTimesheets_throws() {
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(timesheetRepository.findByAssignmentIdAndContractorIdAndStatusAndInvoiceIsNull(
                "a1", "p1", TimesheetStatus.APPROVED)).thenReturn(List.of());
        // no timesheetIds -> auto lookup path
        assertThrows(IllegalArgumentException.class, () -> service.createInvoice(createReq(null, null, null)));
    }

    @Test
    void createInvoice_billingStartAfterEnd_throws() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        ContractorInvoiceRequestDTO req = createReq(List.of("ts1"), null, null);
        req.setBillingStartDate(BILL_END);
        req.setBillingEndDate(BILL_START);
        assertThrows(BusinessValidationException.class, () -> service.createInvoice(req));
    }

    @Test
    void createInvoice_duplicateInvoice_throws() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(assignmentRepository.findById("a1")).thenReturn(Optional.of(assignment));
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        when(contractorInvoiceRepository.existsByAssignmentIdAndBillingStartDateAndBillingEndDateAndStatusNot(
                eq("a1"), any(), any(), eq(InvoiceStatus.CANCELLED))).thenReturn(true);
        assertThrows(BusinessValidationException.class, () -> service.createInvoice(createReq(List.of("ts1"), null, null)));
    }

    // ---------------- PO balance controls ----------------

    @Test
    void createInvoice_poNotActive_throws() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("100000")).currency("INR").issuedDate(A_START).expiryDate(A_END)
                .status(PurchaseOrderStatus.CANCELLED).build();
        po.setId("po1");
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        stubCreateBasics();
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));
        assertThrows(IllegalStateException.class, () -> service.createInvoice(createReq(List.of("ts1"), "po1", null)));
    }

    @Test
    void createInvoice_exceedsPoBalance_throws() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED); // total 5000
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("1000")).currency("INR").issuedDate(A_START).expiryDate(A_END)
                .status(PurchaseOrderStatus.ACTIVE).build();
        po.setId("po1");
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        stubCreateBasics();
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));
        when(contractorInvoiceRepository.findActiveInvoicesByPurchaseOrderId("po1")).thenReturn(List.of());
        assertThrows(IllegalStateException.class, () -> service.createInvoice(createReq(List.of("ts1"), "po1", null)));
    }

    @Test
    void createInvoice_poBecomesExhausted_whenBalanceHitsZero() {
        Timesheet ts = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED); // total 5000
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("5000")).currency("INR").issuedDate(A_START).expiryDate(A_END)
                .status(PurchaseOrderStatus.ACTIVE).build();
        po.setId("po1");
        ContractorInvoice balanceRow = ContractorInvoice.builder().invoiceAmount(new BigDecimal("5000.00")).build();
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(timesheetRepository.findById("ts1")).thenReturn(Optional.of(ts));
        stubCreateBasics();
        when(purchaseOrderRepository.findById("po1")).thenReturn(Optional.of(po));
        // pre-save balance check: nothing spent yet; post-save: the new invoice consumes the full PO
        when(contractorInvoiceRepository.findActiveInvoicesByPurchaseOrderId("po1"))
                .thenReturn(List.of())
                .thenReturn(List.of(balanceRow));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        service.createInvoice(createReq(List.of("ts1"), "po1", null));

        assertEquals(PurchaseOrderStatus.EXHAUSTED, po.getStatus());
    }

    // ===================================================================
    // approve / reject
    // ===================================================================

    @Test
    void approveInvoice_byFinance_submittedToApproved() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.SUBMITTED, null);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> i.getArgument(0));

        ContractorInvoiceResponseDTO res = service.approveInvoice("inv1");

        assertEquals(InvoiceStatus.APPROVED.name(), res.getStatus());
        verify(auditService).logAction(eq("f1"), eq("INVOICE_APPROVED"), eq("ContractorInvoice"), eq("inv1"), anyString());
        verify(notificationPublisher).publishInvoiceApproval(inv);
    }

    @Test
    void approveInvoice_notSubmitted_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.DRAFT, null);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class, () -> service.approveInvoice("inv1"));
    }

    @Test
    void approveInvoice_hiringManager_denied() {
        when(currentUserContext.getCurrentUser()).thenReturn(riya); // HM cannot approve
        assertThrows(AccessDeniedException.class, () -> service.approveInvoice("inv1"));
    }

    @Test
    void rejectInvoice_success_releasesTimesheets_revertsPo() {
        PurchaseOrder po = PurchaseOrder.builder().assignment(assignment).vendor(sam)
                .poAmount(new BigDecimal("5000")).currency("INR").issuedDate(A_START).expiryDate(A_END)
                .status(PurchaseOrderStatus.EXHAUSTED).build();
        po.setId("po1");
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.SUBMITTED, po);
        Timesheet linked = timesheet("ts1", assignment, "40", "0", TimesheetStatus.APPROVED);
        linked.setInvoice(inv);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of(linked));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(contractorInvoiceRepository.findActiveInvoicesByPurchaseOrderId("po1")).thenReturn(List.of()); // balance freed
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        ContractorInvoiceResponseDTO res = service.rejectInvoice("inv1");

        assertEquals(InvoiceStatus.REJECTED.name(), res.getStatus());
        assertNull(linked.getInvoice());
        assertEquals(PurchaseOrderStatus.ACTIVE, po.getStatus());
        verify(notificationPublisher).publishInvoiceRejection(inv);
    }

    @Test
    void rejectInvoice_notSubmitted_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED, null);
        when(currentUserContext.getCurrentUser()).thenReturn(finance);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class, () -> service.rejectInvoice("inv1"));
    }

    // ===================================================================
    // submit / cancel / update
    // ===================================================================

    @Test
    void submitInvoice_draftToSubmitted() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.DRAFT, null);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> i.getArgument(0));

        ContractorInvoiceResponseDTO res = service.submitInvoice("inv1");

        assertEquals(InvoiceStatus.SUBMITTED.name(), res.getStatus());
        assertNotNull(res.getSubmittedDate());
    }

    @Test
    void submitInvoice_wrongStatus_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED, null);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class, () -> service.submitInvoice("inv1"));
    }

    @Test
    void submitInvoice_hiringManagerOutsideOrg_denied() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.DRAFT, null);
        inv.setOrgUnitId("ORG2");
        when(currentUserContext.getCurrentUser()).thenReturn(riya); // ORG1
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(AccessDeniedException.class, () -> service.submitInvoice("inv1"));
    }

    @Test
    void cancelInvoice_draft_success() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.DRAFT, null);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> i.getArgument(0));
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of());

        ContractorInvoiceResponseDTO res = service.cancelInvoice("inv1");
        assertEquals(InvoiceStatus.CANCELLED.name(), res.getStatus());
        verify(auditService).logAction(eq("hr1"), eq("INVOICE_CANCELLED"), eq("ContractorInvoice"), eq("inv1"), anyString());
    }

    @Test
    void cancelInvoice_paid_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.PAID, null);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(BusinessValidationException.class, () -> service.cancelInvoice("inv1"));
    }

    @Test
    void updateInvoice_recalculatesOnDraft() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.DRAFT, null);
        Timesheet ts2 = timesheet("ts2", assignment, "16", "0", TimesheetStatus.APPROVED); // 16/8*1000 = 2000
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        when(timesheetRepository.findByAssignmentId("a1")).thenReturn(List.of()); // no old links to release
        when(timesheetRepository.findById("ts2")).thenReturn(Optional.of(ts2));
        when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(i -> i.getArgument(0));
        when(contractorInvoiceRepository.save(any(ContractorInvoice.class))).thenAnswer(i -> i.getArgument(0));

        ContractorInvoiceRequestDTO req = ContractorInvoiceRequestDTO.builder()
                .assignmentId("a1").contractorId("cu1").invoicePeriod("2026-08").timesheetIds(List.of("ts2")).build();

        ContractorInvoiceResponseDTO res = service.updateInvoice("inv1", req);
        assertEquals(0, new BigDecimal("2000.00").compareTo(res.getTotalAmount()));
        verify(auditService).logAction(eq("hr1"), eq("INVOICE_UPDATED"), eq("ContractorInvoice"), eq("inv1"), anyString());
    }

    @Test
    void updateInvoice_wrongStatus_throws() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.SUBMITTED, null);
        when(currentUserContext.getCurrentUser()).thenReturn(riya);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        ContractorInvoiceRequestDTO req = ContractorInvoiceRequestDTO.builder()
                .assignmentId("a1").contractorId("cu1").invoicePeriod("2026-08").timesheetIds(List.of("ts2")).build();
        assertThrows(BusinessValidationException.class, () -> service.updateInvoice("inv1", req));
    }

    // ---------------- view access ----------------

    @Test
    void getInvoiceById_contractorOwner_ok() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED, null);
        when(currentUserContext.getCurrentUser()).thenReturn(arjun);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertEquals("inv1", service.getInvoiceById("inv1").getId());
    }

    @Test
    void getInvoiceById_otherContractor_denied() {
        ContractorInvoice inv = invoice("inv1", InvoiceStatus.APPROVED, null);
        User other = user("cu2", "mallory@x.com", UserRole.CONTRACTOR);
        when(currentUserContext.getCurrentUser()).thenReturn(other);
        when(contractorInvoiceRepository.findById("inv1")).thenReturn(Optional.of(inv));
        assertThrows(AccessDeniedException.class, () -> service.getInvoiceById("inv1"));
    }
}

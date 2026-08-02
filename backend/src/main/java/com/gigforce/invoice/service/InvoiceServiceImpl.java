package com.gigforce.invoice.service;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.repository.TimesheetRepository;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.invoice.dto.ContractorInvoiceRequestDTO;
import com.gigforce.invoice.dto.ContractorInvoiceResponseDTO;
import com.gigforce.invoice.dto.BatchInvoiceRequestDTO;
import com.gigforce.invoice.dto.BatchInvoiceResponseDTO;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.InvoiceStatus;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import com.gigforce.invoice.repository.ContractorInvoiceRepository;
import com.gigforce.invoice.repository.PurchaseOrderRepository;
import com.gigforce.security.CurrentUserContext;
import com.gigforce.notification.publisher.NotificationPublisher;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.common.id.IdSequenceRepository;
import com.gigforce.common.id.IdSequence;
import com.gigforce.audit.service.AuditService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.domain.Specification;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private final ContractorInvoiceRepository contractorInvoiceRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final AssignmentRepository assignmentRepository;
    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;
    private final NotificationPublisher notificationPublisher;
    private final ContractorProfileRepository contractorProfileRepository;
    private final IdSequenceRepository idSequenceRepository;
    private final AuditService auditService;

    @Value("${gigforce.invoice.taxPercentage:0.0}")
    private double taxPercentage;

    public InvoiceServiceImpl(
            ContractorProfileRepository contractorProfileRepository,
            ContractorInvoiceRepository contractorInvoiceRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            AssignmentRepository assignmentRepository,
            TimesheetRepository timesheetRepository,
            UserRepository userRepository,
            CurrentUserContext currentUserContext,
            NotificationPublisher notificationPublisher,
            IdSequenceRepository idSequenceRepository,
            AuditService auditService) {
        this.contractorInvoiceRepository = contractorInvoiceRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.assignmentRepository = assignmentRepository;
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
        this.notificationPublisher = notificationPublisher;
        this.contractorProfileRepository = contractorProfileRepository;
        this.idSequenceRepository = idSequenceRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO createInvoice(ContractorInvoiceRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: HIRING_MANAGER allowed to create invoices
        if (!"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to create invoices.");
        }

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found with ID: " + request.getAssignmentId()));

        // Hiring Manager tenant check
        if ("HIRING_MANAGER".equals(role) && !assignment.getOrgUnitId().equals(currentUser.getOrgUnitId())) {
            throw new AccessDeniedException("Access Denied: You cannot create invoices outside your organization.");
        }

        ContractorProfile contractorProfile = assignment.getContractorProfile();

        // 1. Fetch eligible approved timesheets within the billing period
        List<Timesheet> timesheets = new ArrayList<>();
        LocalDate billingStartDate = request.getBillingStartDate();
        LocalDate billingEndDate = request.getBillingEndDate();

        if (request.getTimesheetIds() != null && !request.getTimesheetIds().isEmpty()) {
            for (String tsId : request.getTimesheetIds()) {
                Timesheet ts = timesheetRepository.findById(tsId)
                        .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + tsId));

                // Validate timesheet matches details
                if (!ts.getAssignment().getId().equals(assignment.getId())) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " does not belong to assignment " + assignment.getId());
                }
                if (ts.getStatus() != TimesheetStatus.APPROVED) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " is not APPROVED. Current status: " + ts.getStatus());
                }
                if (ts.getInvoice() != null) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " is already associated with invoice: " + ts.getInvoice().getId());
                }
                timesheets.add(ts);
            }
            if (billingStartDate == null) {
                billingStartDate = timesheets.stream().map(Timesheet::getWeekStartDate).min(LocalDate::compareTo).orElse(null);
            }
            if (billingEndDate == null) {
                billingEndDate = timesheets.stream().map(Timesheet::getWeekEndDate).max(LocalDate::compareTo).orElse(null);
            }
        } else {
            // Find all approved timesheets for this assignment that are not yet invoiced
            timesheets = timesheetRepository.findByAssignmentIdAndContractorIdAndStatusAndInvoiceIsNull(
                    assignment.getId(), contractorProfile.getId(), TimesheetStatus.APPROVED);
            if (billingStartDate == null) {
                billingStartDate = timesheets.stream().map(Timesheet::getWeekStartDate).min(LocalDate::compareTo).orElse(assignment.getStartDate());
            }
            if (billingEndDate == null) {
                billingEndDate = timesheets.stream().map(Timesheet::getWeekEndDate).max(LocalDate::compareTo).orElse(assignment.getEndDate());
            }
        }

        timesheets = timesheets.stream()
                .filter(ts -> !ts.getWeekStartDate().isAfter(assignment.getEndDate()))
                .collect(Collectors.toList());

        if (timesheets.isEmpty()) {
            throw new IllegalArgumentException("No approved, uninvoiced timesheets found for this assignment.");
        }

        if (billingStartDate == null || billingEndDate == null) {
            throw new BusinessValidationException("Billing period dates are required.");
        }

        // 2. Validate billing period
        if (billingStartDate.isAfter(billingEndDate)) {
            throw new BusinessValidationException("Billing start date cannot be after billing end date.");
        }

        // Billing period falls within assignment duration (with 7-day buffer)
        if (billingStartDate.isBefore(assignment.getStartDate().minusDays(7)) ||
                (assignment.getEndDate() != null && billingEndDate.isAfter(assignment.getEndDate().plusDays(7)))) {
            throw new BusinessValidationException("Billing period must align within the assignment start and end dates.");
        }

        // 3. Prevent duplicate invoices for the same assignment and billing period
        boolean duplicateExists = contractorInvoiceRepository.existsByAssignmentIdAndBillingStartDateAndBillingEndDateAndStatusNot(
                assignment.getId(), billingStartDate, billingEndDate, InvoiceStatus.CANCELLED);
        if (duplicateExists) {
            throw new BusinessValidationException("An invoice already exists for this assignment and billing period.");
        }

        // Calculate hours and invoice amount strictly on backend
        BigDecimal totalRegularHours = BigDecimal.ZERO;
        BigDecimal totalOvertimeHours = BigDecimal.ZERO;
        BigDecimal regularAmount = BigDecimal.ZERO;
        BigDecimal overtimeAmount = BigDecimal.ZERO;

        BigDecimal dailyHoursLimit = BigDecimal.valueOf(8.00);

        for (Timesheet ts : timesheets) {
            BigDecimal agreedRate = ts.getAgreedRatePerDay() != null ? ts.getAgreedRatePerDay() : assignment.getAgreedRatePerDay();
            totalRegularHours = totalRegularHours.add(ts.getHoursLogged());
            totalOvertimeHours = totalOvertimeHours.add(ts.getOvertimeLogged());
            BigDecimal regAmt = ts.getHoursLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(agreedRate);
            regularAmount = regularAmount.add(regAmt);
            BigDecimal otAmt = ts.getOvertimeLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1.5)).multiply(agreedRate);
            overtimeAmount = overtimeAmount.add(otAmt);
        }

        BigDecimal subtotal = regularAmount.add(overtimeAmount);
        BigDecimal taxAmt = subtotal.multiply(BigDecimal.valueOf(taxPercentage / 100.0)).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.add(taxAmt).setScale(2, java.math.RoundingMode.HALF_UP);

        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Total Amount must be greater than 0.");
        }

        // PO Controls - Derive PO from assignment's purchaseOrderId if available
        PurchaseOrder po = null;
        if (assignment.getPurchaseOrderId() != null && !assignment.getPurchaseOrderId().trim().isEmpty()) {
            po = purchaseOrderRepository.findById(assignment.getPurchaseOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with ID: " + assignment.getPurchaseOrderId()));

            if (po.getStatus() != PurchaseOrderStatus.ACTIVE) {
                throw new IllegalStateException("Cannot generate invoice against a " + po.getStatus() + " Purchase Order.");
            }

            BigDecimal remainingPOBalance = getRemainingPOBalance(po);
            if (totalAmount.compareTo(remainingPOBalance) > 0) {
                throw new IllegalStateException("Invoice amount (" + totalAmount + ") exceeds remaining PO balance (" + remainingPOBalance + ").");
            }
        }

        String invoiceNum = generateInvoiceNumber();

        // Status defaults to SUBMITTED unless explicitly requested as DRAFT
        InvoiceStatus initialStatus = InvoiceStatus.SUBMITTED;
        if (request.getStatus() != null && "DRAFT".equalsIgnoreCase(request.getStatus().trim())) {
            initialStatus = InvoiceStatus.DRAFT;
        }

        ContractorInvoice invoice = ContractorInvoice.builder()
                .purchaseOrder(po)
                .assignment(assignment)
                .contractor(contractorProfile.getUser())
                .contractorProfile(contractorProfile)
                .vendor(assignment.getVendor())
                .orgUnitId(assignment.getOrgUnitId())
                .invoiceNumber(invoiceNum)
                .invoiceDate(LocalDate.now())
                .billingStartDate(billingStartDate)
                .billingEndDate(billingEndDate)
                .invoicePeriod(request.getInvoicePeriod())
                .hoursBilled(totalRegularHours.add(totalOvertimeHours))
                .invoiceAmount(totalAmount)
                .totalRegularHours(totalRegularHours.setScale(2, java.math.RoundingMode.HALF_UP))
                .totalOvertimeHours(totalOvertimeHours.setScale(2, java.math.RoundingMode.HALF_UP))
                .regularAmount(regularAmount.setScale(2, java.math.RoundingMode.HALF_UP))
                .overtimeAmount(overtimeAmount.setScale(2, java.math.RoundingMode.HALF_UP))
                .taxAmount(taxAmt)
                .totalAmount(totalAmount)
                .status(initialStatus)
                .submittedDate(initialStatus == InvoiceStatus.SUBMITTED ? LocalDateTime.now() : null)
                .build();

        invoice = contractorInvoiceRepository.save(invoice);

        // Associate timesheets
        for (Timesheet ts : timesheets) {
            ts.setInvoice(invoice);
            timesheetRepository.save(ts);
        }

        if (po != null) {
            BigDecimal updatedPOBalance = getRemainingPOBalance(po);
            if (updatedPOBalance.compareTo(BigDecimal.ZERO) <= 0) {
                po.setStatus(PurchaseOrderStatus.EXHAUSTED);
                purchaseOrderRepository.save(po);
            }
        }

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_CREATED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice created successfully."
        );

        if (initialStatus == InvoiceStatus.SUBMITTED) {
            auditService.logAction(
                    currentUser.getId(),
                    "INVOICE_SUBMITTED",
                    "ContractorInvoice",
                    invoice.getId(),
                    "Invoice submitted successfully."
            );
        }

        notificationPublisher.publishInvoiceSubmission(invoice);

        return mapToDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public ContractorInvoiceResponseDTO getInvoiceById(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        validateViewAccess(invoice, currentUser);

        return mapToDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContractorInvoiceResponseDTO> getAllInvoices() {
        return searchInvoices(null, null, null, null, null, null, null, null, null, null, null);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO approveInvoice(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: ADMIN, FINANCE allowed to approve
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin or Finance roles can approve invoices.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        // Workflow Validation: Only SUBMITTED invoices can be approved
        if (invoice.getStatus() != InvoiceStatus.SUBMITTED) {
            throw new BusinessValidationException("Invalid workflow transition: Cannot approve invoice in status " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.APPROVED);
        invoice = contractorInvoiceRepository.save(invoice);

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_APPROVED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice approved successfully."
        );

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_UPDATED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice status updated to APPROVED."
        );

        notificationPublisher.publishInvoiceApproval(invoice);

        return mapToDto(invoice);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO rejectInvoice(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: ADMIN, FINANCE allowed to reject
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin or Finance roles can reject invoices.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        // Workflow Validation: Only SUBMITTED invoices can be rejected
        if (invoice.getStatus() != InvoiceStatus.SUBMITTED) {
            throw new BusinessValidationException("Invalid workflow transition: Cannot reject invoice in status " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.REJECTED);
        invoice = contractorInvoiceRepository.save(invoice);

        // Release associated timesheets back to uninvoiced state
        List<Timesheet> timesheets = timesheetRepository.findByAssignmentId(invoice.getAssignment().getId());
        for (Timesheet ts : timesheets) {
            if (ts.getInvoice() != null && ts.getInvoice().getId().equals(invoice.getId())) {
                ts.setInvoice(null);
                timesheetRepository.save(ts);
            }
        }

        // PO Control: Rejecting an invoice increases PO balance
        PurchaseOrder po = invoice.getPurchaseOrder();
        if (po != null && po.getStatus() == PurchaseOrderStatus.EXHAUSTED) {
            BigDecimal remaining = getRemainingPOBalance(po);
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                po.setStatus(PurchaseOrderStatus.ACTIVE);
                purchaseOrderRepository.save(po);
            }
        }

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_REJECTED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice rejected successfully."
        );

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_UPDATED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice status updated to REJECTED."
        );

        notificationPublisher.publishInvoiceRejection(invoice);

        return mapToDto(invoice);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO submitInvoice(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to submit invoices.");
        }

        if ("HIRING_MANAGER".equals(role) && !invoice.getOrgUnitId().equals(currentUser.getOrgUnitId())) {
            throw new AccessDeniedException("Access Denied: You cannot submit invoices outside your organization.");
        }

        if (invoice.getStatus() != InvoiceStatus.DRAFT && invoice.getStatus() != InvoiceStatus.REJECTED) {
            throw new BusinessValidationException("Only DRAFT or REJECTED invoices can be submitted. Current status: " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.SUBMITTED);
        invoice.setSubmittedDate(LocalDateTime.now());
        invoice = contractorInvoiceRepository.save(invoice);

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_SUBMITTED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice submitted successfully."
        );

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_UPDATED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice status updated to SUBMITTED."
        );

        return mapToDto(invoice);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO cancelInvoice(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to cancel invoices.");
        }

        if ("HIRING_MANAGER".equals(role) && !invoice.getOrgUnitId().equals(currentUser.getOrgUnitId())) {
            throw new AccessDeniedException("Access Denied: You cannot cancel invoices outside your organization.");
        }

        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new BusinessValidationException("Cannot cancel invoice in status " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice = contractorInvoiceRepository.save(invoice);

        // Release associated timesheets
        List<Timesheet> timesheets = timesheetRepository.findByAssignmentId(invoice.getAssignment().getId());
        for (Timesheet ts : timesheets) {
            if (ts.getInvoice() != null && ts.getInvoice().getId().equals(invoice.getId())) {
                ts.setInvoice(null);
                timesheetRepository.save(ts);
            }
        }

        PurchaseOrder po = invoice.getPurchaseOrder();
        if (po != null && po.getStatus() == PurchaseOrderStatus.EXHAUSTED) {
            BigDecimal remaining = getRemainingPOBalance(po);
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                po.setStatus(PurchaseOrderStatus.ACTIVE);
                purchaseOrderRepository.save(po);
            }
        }

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_CANCELLED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice cancelled successfully."
        );

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_UPDATED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice status updated to CANCELLED."
        );

        return mapToDto(invoice);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO updateInvoice(String id, ContractorInvoiceRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to update invoices.");
        }

        if ("HIRING_MANAGER".equals(role) && !invoice.getOrgUnitId().equals(currentUser.getOrgUnitId())) {
            throw new AccessDeniedException("Access Denied: You cannot update invoices outside your organization.");
        }

        if (invoice.getStatus() != InvoiceStatus.DRAFT && invoice.getStatus() != InvoiceStatus.REJECTED) {
            throw new BusinessValidationException("Only DRAFT or REJECTED invoices can be updated. Current status: " + invoice.getStatus());
        }

        if (invoice.getStatus() == InvoiceStatus.REJECTED) {
            invoice.setStatus(InvoiceStatus.DRAFT);
        }

        Assignment assignment = invoice.getAssignment();
        ContractorProfile contractorProfile = invoice.getContractorProfile();

        LocalDate billingStartDate = request.getBillingStartDate() != null ? request.getBillingStartDate() : invoice.getBillingStartDate();
        LocalDate billingEndDate = request.getBillingEndDate() != null ? request.getBillingEndDate() : invoice.getBillingEndDate();

        if (billingStartDate.isAfter(billingEndDate)) {
            throw new BusinessValidationException("Billing start date cannot be after billing end date.");
        }

        if (billingStartDate.isBefore(assignment.getStartDate().minusDays(7)) ||
            (assignment.getEndDate() != null && billingEndDate.isAfter(assignment.getEndDate().plusDays(7)))) {
            throw new BusinessValidationException("Billing period must fall within the assignment duration.");
        }

        if (!billingStartDate.equals(invoice.getBillingStartDate()) || !billingEndDate.equals(invoice.getBillingEndDate())) {
            boolean duplicateExists = contractorInvoiceRepository.existsByAssignmentIdAndBillingStartDateAndBillingEndDateAndStatusNot(
                    assignment.getId(), billingStartDate, billingEndDate, InvoiceStatus.CANCELLED);
            if (duplicateExists) {
                throw new BusinessValidationException("An invoice already exists for this assignment and billing period.");
            }
        }

        // Release old timesheets
        List<Timesheet> oldTimesheets = timesheetRepository.findByAssignmentId(assignment.getId());
        for (Timesheet ts : oldTimesheets) {
            if (ts.getInvoice() != null && ts.getInvoice().getId().equals(invoice.getId())) {
                ts.setInvoice(null);
                timesheetRepository.save(ts);
            }
        }

        List<Timesheet> timesheets = new ArrayList<>();
        if (request.getTimesheetIds() != null && !request.getTimesheetIds().isEmpty()) {
            for (String tsId : request.getTimesheetIds()) {
                Timesheet ts = timesheetRepository.findById(tsId)
                        .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + tsId));
                if (!ts.getAssignment().getId().equals(assignment.getId())) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " does not belong to assignment " + assignment.getId());
                }
                if (ts.getStatus() != TimesheetStatus.APPROVED) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " is not APPROVED. Current status: " + ts.getStatus());
                }
                if (ts.getInvoice() != null) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " is already associated with invoice: " + ts.getInvoice().getId());
                }
                timesheets.add(ts);
            }
        } else {
            timesheets = timesheetRepository.findByAssignmentIdAndContractorIdAndStatusAndInvoiceIsNull(
                    assignment.getId(), contractorProfile.getId(), TimesheetStatus.APPROVED);
        }

        if (timesheets.isEmpty()) {
            throw new IllegalArgumentException("No approved, uninvoiced timesheets found for this assignment.");
        }

        BigDecimal totalRegularHours = BigDecimal.ZERO;
        BigDecimal totalOvertimeHours = BigDecimal.ZERO;
        BigDecimal regularAmount = BigDecimal.ZERO;
        BigDecimal overtimeAmount = BigDecimal.ZERO;
        BigDecimal dailyHoursLimit = BigDecimal.valueOf(8.00);
        BigDecimal agreedRate = assignment.getAgreedRatePerDay();

        for (Timesheet ts : timesheets) {
            totalRegularHours = totalRegularHours.add(ts.getHoursLogged());
            totalOvertimeHours = totalOvertimeHours.add(ts.getOvertimeLogged());
            BigDecimal regAmt = ts.getHoursLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(agreedRate);
            regularAmount = regularAmount.add(regAmt);
            BigDecimal otAmt = ts.getOvertimeLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1.5)).multiply(agreedRate);
            overtimeAmount = overtimeAmount.add(otAmt);
        }

        BigDecimal subtotal = regularAmount.add(overtimeAmount);
        BigDecimal taxAmt = subtotal.multiply(BigDecimal.valueOf(taxPercentage / 100.0)).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.add(taxAmt).setScale(2, java.math.RoundingMode.HALF_UP);

        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Total Amount must be greater than 0.");
        }

        invoice.setBillingStartDate(billingStartDate);
        invoice.setBillingEndDate(billingEndDate);
        invoice.setHoursBilled(totalRegularHours.add(totalOvertimeHours));
        invoice.setInvoiceAmount(totalAmount);
        invoice.setTotalRegularHours(totalRegularHours.setScale(2, java.math.RoundingMode.HALF_UP));
        invoice.setTotalOvertimeHours(totalOvertimeHours.setScale(2, java.math.RoundingMode.HALF_UP));
        invoice.setRegularAmount(regularAmount.setScale(2, java.math.RoundingMode.HALF_UP));
        invoice.setOvertimeAmount(overtimeAmount.setScale(2, java.math.RoundingMode.HALF_UP));
        invoice.setTaxAmount(taxAmt);
        invoice.setTotalAmount(totalAmount);

        if (request.getInvoicePeriod() != null) {
            invoice.setInvoicePeriod(request.getInvoicePeriod());
        }


        for (Timesheet ts : timesheets) {
            ts.setInvoice(invoice);
            timesheetRepository.save(ts);
        }

        invoice = contractorInvoiceRepository.save(invoice);

        auditService.logAction(
                currentUser.getId(),
                "INVOICE_UPDATED",
                "ContractorInvoice",
                invoice.getId(),
                "Invoice details updated."
        );

        return mapToDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContractorInvoiceResponseDTO> searchInvoices(
            String invoiceId,
            String invoiceNumber,
            String assignmentId,
            String contractorProfileId,
            String vendorId,
            InvoiceStatus status,
            LocalDate billingStartDate,
            LocalDate billingEndDate,
            LocalDate invoiceDate,
            LocalDate paymentDate,
            String orgUnitId) {

        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        String currentOrgUnitId = currentUser.getOrgUnitId();

        Specification<ContractorInvoice> spec = Specification.where(null);

        // Security role isolation
        if ("CONTRACTOR".equals(role)) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractor").get("id"), currentUser.getId()));
        } else if ("HIRING_MANAGER".equals(role)) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), currentOrgUnitId));
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            spec = spec.and((root, query, cb) -> cb.or(
                cb.equal(root.get("assignment").get("vendor").get("id"), currentUser.getId()),
                cb.equal(root.get("purchaseOrder").get("vendor").get("id"), currentUser.getId())
            ));
        } else if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            // Full access
        } else {
            throw new AccessDeniedException("Access Denied: Unauthorized role.");
        }

        // Filters
        if (invoiceId != null && !invoiceId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), invoiceId));
        }
        if (invoiceNumber != null && !invoiceNumber.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("invoiceNumber"), invoiceNumber));
        }
        if (assignmentId != null && !assignmentId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignment").get("id"), assignmentId));
        }
        if (contractorProfileId != null && !contractorProfileId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("contractorProfile").get("id"), contractorProfileId));
        }
        if (vendorId != null && !vendorId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vendor").get("id"), vendorId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (billingStartDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("billingStartDate"), billingStartDate));
        }
        if (billingEndDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("billingEndDate"), billingEndDate));
        }
        if (invoiceDate != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("invoiceDate"), invoiceDate));
        }
        if (paymentDate != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("paymentDate"), paymentDate));
        }
        if (orgUnitId != null && !orgUnitId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), orgUnitId));
        }

        return contractorInvoiceRepository.findAll(spec).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private BigDecimal getRemainingPOBalance(PurchaseOrder po) {
        List<ContractorInvoice> invoices = contractorInvoiceRepository.findActiveInvoicesByPurchaseOrderId(po.getId());
        BigDecimal totalSpent = BigDecimal.ZERO;
        for (ContractorInvoice inv : invoices) {
            totalSpent = totalSpent.add(inv.getInvoiceAmount());
        }
        return po.getPOAmount().subtract(totalSpent);
    }

    private void validateViewAccess(ContractorInvoice invoice, User currentUser) {
        String role = currentUser.getRole().name();
        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return;
        }

        if ("HIRING_MANAGER".equals(role)) {
            if (invoice.getAssignment().getHiringManager().getId().equals(currentUser.getId())) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view invoices for assignments you manage.");
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            if ((invoice.getAssignment().getVendor() != null && invoice.getAssignment().getVendor().getId().equals(currentUser.getId())) ||
                    (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getVendor().getId().equals(currentUser.getId()))) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view invoices submitted by or assigned to your Vendor profile.");
        }

        if ("CONTRACTOR".equals(role)) {
            if (invoice.getContractor().getId().equals(currentUser.getId())) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view invoices issued under your Contractor profile.");
        }

        throw new AccessDeniedException("Access Denied: You do not have permissions to view this Invoice.");
    }

    @Transactional
    public synchronized String generateInvoiceNumber() {
        int currentYear = LocalDate.now().getYear();
        String prefix = "INV-NUM-" + currentYear;
        IdSequence seq = idSequenceRepository.findById(prefix).orElse(null);
        if (seq == null) {
            seq = new IdSequence(prefix, 1L);
        } else {
            seq.setLastValue(seq.getLastValue() + 1);
        }
        idSequenceRepository.save(seq);
        return String.format("INV-%d-%06d", currentYear, seq.getLastValue());
    }

    private ContractorInvoiceResponseDTO mapToDto(ContractorInvoice invoice) {
        return ContractorInvoiceResponseDTO.builder()
                .id(invoice.getId())
                .poId(invoice.getPurchaseOrder() != null ? invoice.getPurchaseOrder().getId() : null)
                .assignmentId(invoice.getAssignment().getId())
                .contractorId(invoice.getContractor().getId())
                .contractorProfileId(invoice.getContractorProfile().getId())
                .vendorId(invoice.getVendor() != null ? invoice.getVendor().getId() : null)
                .orgUnitId(invoice.getOrgUnitId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceDate(invoice.getInvoiceDate())
                .billingStartDate(invoice.getBillingStartDate())
                .billingEndDate(invoice.getBillingEndDate())
                .invoicePeriod(invoice.getInvoicePeriod())
                .hoursBilled(invoice.getHoursBilled())
                .invoiceAmount(invoice.getInvoiceAmount())
                .totalRegularHours(invoice.getTotalRegularHours())
                .totalOvertimeHours(invoice.getTotalOvertimeHours())
                .regularAmount(invoice.getRegularAmount())
                .overtimeAmount(invoice.getOvertimeAmount())
                .taxAmount(invoice.getTaxAmount())
                .totalAmount(invoice.getTotalAmount())
                .paymentDate(invoice.getPaymentDate())
                .submittedDate(invoice.getSubmittedDate())
                .status(invoice.getStatus().name())
                .contractorName(invoice.getContractor() != null ? invoice.getContractor().getName() : null)
                .vendorName(invoice.getVendor() != null ? invoice.getVendor().getName() : null)
                .build();
    }

    @Override
    public BatchInvoiceResponseDTO previewMonthlyInvoices(Integer year, Integer month) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        List<Timesheet> timesheets = timesheetRepository.findByStatusAndInvoiceIsNull(TimesheetStatus.APPROVED);

        final String role = currentUser.getRole().name();
        final String orgUnitId = currentUser.getOrgUnitId();

        List<Timesheet> filtered = timesheets.stream()
                .filter(ts -> ts.getWeekStartDate().getYear() == year && ts.getWeekStartDate().getMonthValue() == month)
                .filter(ts -> !ts.getWeekStartDate().isAfter(ts.getAssignment().getEndDate()))
                .filter(ts -> {
                    if ("HIRING_MANAGER".equals(role)) {
                        return orgUnitId != null && orgUnitId.equals(ts.getOrgUnitId());
                    }
                    return true;
                })
                .collect(Collectors.toList());

        BigDecimal totalBilledAmount = BigDecimal.ZERO;
        java.util.Map<String, List<Timesheet>> groupedByAssignment = filtered.stream()
                .collect(Collectors.groupingBy(ts -> ts.getAssignment().getId()));

        BigDecimal dailyHoursLimit = BigDecimal.valueOf(8.00);

        for (java.util.Map.Entry<String, List<Timesheet>> entry : groupedByAssignment.entrySet()) {
            List<Timesheet> group = entry.getValue();
            if (group.isEmpty()) continue;
            Assignment asn = group.get(0).getAssignment();

            BigDecimal regularAmount = BigDecimal.ZERO;
            BigDecimal overtimeAmount = BigDecimal.ZERO;

            for (Timesheet ts : group) {
                BigDecimal agreedRate = ts.getAgreedRatePerDay() != null ? ts.getAgreedRatePerDay() : asn.getAgreedRatePerDay();
                BigDecimal regAmt = ts.getHoursLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(agreedRate);
                regularAmount = regularAmount.add(regAmt);
                BigDecimal otAmt = ts.getOvertimeLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1.5)).multiply(agreedRate);
                overtimeAmount = overtimeAmount.add(otAmt);
            }

            BigDecimal subtotal = regularAmount.add(overtimeAmount);
            BigDecimal taxAmt = subtotal.multiply(BigDecimal.valueOf(taxPercentage / 100.0)).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal invoiceTotal = subtotal.add(taxAmt).setScale(2, java.math.RoundingMode.HALF_UP);
            totalBilledAmount = totalBilledAmount.add(invoiceTotal);
        }

        return BatchInvoiceResponseDTO.builder()
                .invoicesGeneratedCount(groupedByAssignment.size())
                .totalTimesheetsProcessed(filtered.size())
                .totalAmountBilled(totalBilledAmount.setScale(2, java.math.RoundingMode.HALF_UP))
                .invoiceIds(new ArrayList<>())
                .build();
    }

    @Override
    @Transactional
    public BatchInvoiceResponseDTO generateMonthlyInvoices(BatchInvoiceRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        if (!"HIRING_MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to generate invoices.");
        }

        Integer year = request.getYear();
        Integer month = request.getMonth();

        List<Timesheet> timesheets = timesheetRepository.findByStatusAndInvoiceIsNull(TimesheetStatus.APPROVED);

        final String orgUnitId = currentUser.getOrgUnitId();

        List<Timesheet> filtered = timesheets.stream()
                .filter(ts -> ts.getWeekStartDate().getYear() == year && ts.getWeekStartDate().getMonthValue() == month)
                .filter(ts -> !ts.getWeekStartDate().isAfter(ts.getAssignment().getEndDate()))
                .filter(ts -> {
                    if ("HIRING_MANAGER".equals(role)) {
                        return orgUnitId != null && orgUnitId.equals(ts.getOrgUnitId());
                    }
                    return true;
                })
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            throw new BusinessValidationException("No approved, uninvoiced timesheets found for the selected month.");
        }

        java.util.Map<String, List<Timesheet>> groupedByAssignment = filtered.stream()
                .collect(Collectors.groupingBy(ts -> ts.getAssignment().getId()));

        BigDecimal dailyHoursLimit = BigDecimal.valueOf(8.00);
        List<String> invoiceIds = new ArrayList<>();
        BigDecimal totalBilledAmount = BigDecimal.ZERO;

        for (java.util.Map.Entry<String, List<Timesheet>> entry : groupedByAssignment.entrySet()) {
            List<Timesheet> group = entry.getValue();
            Assignment assignment = group.get(0).getAssignment();
            com.gigforce.identity.entity.ContractorProfile contractorProfile = assignment.getContractorProfile();

            BigDecimal totalRegularHours = BigDecimal.ZERO;
            BigDecimal totalOvertimeHours = BigDecimal.ZERO;
            BigDecimal regularAmount = BigDecimal.ZERO;
            BigDecimal overtimeAmount = BigDecimal.ZERO;

            LocalDate billingStartDate = null;
            LocalDate billingEndDate = null;

            for (Timesheet ts : group) {
                BigDecimal agreedRate = ts.getAgreedRatePerDay() != null ? ts.getAgreedRatePerDay() : assignment.getAgreedRatePerDay();
                totalRegularHours = totalRegularHours.add(ts.getHoursLogged());
                totalOvertimeHours = totalOvertimeHours.add(ts.getOvertimeLogged());

                BigDecimal regAmt = ts.getHoursLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(agreedRate);
                regularAmount = regularAmount.add(regAmt);
                BigDecimal otAmt = ts.getOvertimeLogged().divide(dailyHoursLimit, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(1.5)).multiply(agreedRate);
                overtimeAmount = overtimeAmount.add(otAmt);

                if (billingStartDate == null || ts.getWeekStartDate().isBefore(billingStartDate)) {
                    billingStartDate = ts.getWeekStartDate();
                }
                if (billingEndDate == null || ts.getWeekEndDate().isAfter(billingEndDate)) {
                    billingEndDate = ts.getWeekEndDate();
                }
            }

            BigDecimal subtotal = regularAmount.add(overtimeAmount);
            BigDecimal taxAmt = subtotal.multiply(BigDecimal.valueOf(taxPercentage / 100.0)).setScale(2, java.math.RoundingMode.HALF_UP);
            BigDecimal totalAmount = subtotal.add(taxAmt).setScale(2, java.math.RoundingMode.HALF_UP);

            PurchaseOrder po = null;
            if (assignment.getPurchaseOrderId() != null && !assignment.getPurchaseOrderId().trim().isEmpty()) {
                po = purchaseOrderRepository.findById(assignment.getPurchaseOrderId())
                        .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with ID: " + assignment.getPurchaseOrderId()));

                if (po.getStatus() != PurchaseOrderStatus.ACTIVE) {
                    throw new IllegalStateException("Cannot generate invoice against a " + po.getStatus() + " Purchase Order.");
                }

                BigDecimal remainingPOBalance = getRemainingPOBalance(po);
                if (totalAmount.compareTo(remainingPOBalance) > 0) {
                    throw new IllegalStateException("Invoice amount (" + totalAmount + ") exceeds remaining PO balance (" + remainingPOBalance + ").");
                }
            }

            String invoiceNum = generateInvoiceNumber();
            String monthName = java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy")
                    .format(LocalDate.of(year, month, 1));

            ContractorInvoice invoice = ContractorInvoice.builder()
                    .purchaseOrder(po)
                    .assignment(assignment)
                    .contractor(contractorProfile.getUser())
                    .contractorProfile(contractorProfile)
                    .vendor(assignment.getVendor())
                    .orgUnitId(assignment.getOrgUnitId())
                    .invoiceNumber(invoiceNum)
                    .invoiceDate(LocalDate.now())
                    .billingStartDate(billingStartDate)
                    .billingEndDate(billingEndDate)
                    .invoicePeriod(monthName)
                    .hoursBilled(totalRegularHours.add(totalOvertimeHours))
                    .invoiceAmount(totalAmount)
                    .totalRegularHours(totalRegularHours.setScale(2, java.math.RoundingMode.HALF_UP))
                    .totalOvertimeHours(totalOvertimeHours.setScale(2, java.math.RoundingMode.HALF_UP))
                    .regularAmount(regularAmount.setScale(2, java.math.RoundingMode.HALF_UP))
                    .overtimeAmount(overtimeAmount.setScale(2, java.math.RoundingMode.HALF_UP))
                    .taxAmount(taxAmt)
                    .totalAmount(totalAmount)
                    .status(InvoiceStatus.SUBMITTED)
                    .submittedDate(LocalDateTime.now())
                    .build();

            invoice = contractorInvoiceRepository.save(invoice);
            invoiceIds.add(invoice.getId());
            totalBilledAmount = totalBilledAmount.add(totalAmount);

            for (Timesheet ts : group) {
                ts.setInvoice(invoice);
                timesheetRepository.save(ts);
            }

            if (po != null) {
                BigDecimal updatedPOBalance = getRemainingPOBalance(po);
                if (updatedPOBalance.compareTo(BigDecimal.ZERO) <= 0) {
                    po.setStatus(PurchaseOrderStatus.EXHAUSTED);
                    purchaseOrderRepository.save(po);
                }
            }

            auditService.logAction(
                    currentUser.getId(),
                    "CONTRACTOR_INVOICE",
                    invoice.getId(),
                    "BATCH_GENERATE",
                    "Batch generated invoice for " + monthName + ", Amount: " + totalAmount
            );

            try {
                notificationPublisher.publishInvoiceSubmission(invoice);
            } catch (Exception e) {
                System.err.println("Failed to publish invoice submission notification: " + e.getMessage());
            }
        }

        return BatchInvoiceResponseDTO.builder()
                .invoicesGeneratedCount(groupedByAssignment.size())
                .totalTimesheetsProcessed(filtered.size())
                .totalAmountBilled(totalBilledAmount.setScale(2, java.math.RoundingMode.HALF_UP))
                .invoiceIds(invoiceIds)
                .build();
    }
}

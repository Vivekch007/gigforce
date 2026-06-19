package com.gigforce.invoice.service;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.repository.TimesheetRepository;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.invoice.dto.ContractorInvoiceRequestDTO;
import com.gigforce.invoice.dto.ContractorInvoiceResponseDTO;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.InvoiceStatus;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import com.gigforce.invoice.repository.ContractorInvoiceRepository;
import com.gigforce.invoice.repository.PurchaseOrderRepository;
import com.gigforce.security.CurrentUserContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.gigforce.notification.service.NotificationService;
import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.identity.enums.UserRole;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    private final ContractorInvoiceRepository contractorInvoiceRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final AssignmentRepository assignmentRepository;
    private final TimesheetRepository timesheetRepository;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;
    private final NotificationService notificationService;

    public InvoiceServiceImpl(
            ContractorInvoiceRepository contractorInvoiceRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            AssignmentRepository assignmentRepository,
            TimesheetRepository timesheetRepository,
            UserRepository userRepository,
            CurrentUserContext currentUserContext,
            NotificationService notificationService) {
        this.contractorInvoiceRepository = contractorInvoiceRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.assignmentRepository = assignmentRepository;
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO createInvoice(ContractorInvoiceRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: ADMIN, VENDOR, VENDOR_MANAGER allowed
        if (!"ADMIN".equals(role) && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to submit invoices.");
        }

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found with ID: " + request.getAssignmentId()));

        // IDOR: If VENDOR or VENDOR_MANAGER, verify they own the assignment vendor
        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            if (assignment.getVendor() == null || !assignment.getVendor().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("Access Denied: You can only submit invoices for assignments associated with your Vendor profile.");
            }
        }

        PurchaseOrder po = purchaseOrderRepository.findById(request.getPoId())
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with ID: " + request.getPoId()));

        if (po.getStatus() != PurchaseOrderStatus.ACTIVE) {
            throw new IllegalStateException("Cannot generate invoice against a " + po.getStatus() + " Purchase Order.");
        }

        User contractor = userRepository.findById(request.getContractorId())
                .orElseThrow(() -> new IllegalArgumentException("Contractor not found with ID: " + request.getContractorId()));

        // Fetch eligible timesheets (must be APPROVED, belonging to contractor and assignment, and uninvoiced)
        List<Timesheet> timesheets;
        if (request.getTimesheetIds() != null && !request.getTimesheetIds().isEmpty()) {
            timesheets = new ArrayList<>();
            for (String tsId : request.getTimesheetIds()) {
                Timesheet ts = timesheetRepository.findById(tsId)
                        .orElseThrow(() -> new IllegalArgumentException("Timesheet not found with ID: " + tsId));

                // Validate timesheet matches details
                if (!ts.getAssignment().getId().equals(assignment.getId())) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " does not belong to assignment " + assignment.getId());
                }
                if (!ts.getContractor().getId().equals(contractor.getId())) {
                    throw new IllegalArgumentException("Timesheet " + tsId + " does not belong to contractor " + contractor.getId());
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
            // Auto-fetch all approved uninvoiced timesheets
            timesheets = timesheetRepository.findByAssignmentIdAndContractorIdAndStatusAndInvoiceIsNull(
                    assignment.getId(), contractor.getId(), TimesheetStatus.APPROVED);
        }

        if (timesheets.isEmpty()) {
            throw new IllegalArgumentException("No approved, uninvoiced timesheets found for this assignment and contractor.");
        }

        // Calculate hours and invoice amount strictly on backend
        BigDecimal hoursBilled = BigDecimal.ZERO;
        BigDecimal invoiceAmount = BigDecimal.ZERO;

        for (Timesheet ts : timesheets) {
            hoursBilled = hoursBilled.add(ts.getHoursLogged()).add(ts.getOvertimeLogged());
            invoiceAmount = invoiceAmount.add(ts.getBillableAmount());
        }

        // PO Controls: Calculate remaining PO balance
        BigDecimal remainingPOBalance = getRemainingPOBalance(po);
        if (invoiceAmount.compareTo(remainingPOBalance) > 0) {
            throw new IllegalStateException("Invoice amount (" + invoiceAmount + ") exceeds remaining PO balance (" + remainingPOBalance + ").");
        }

        ContractorInvoice invoice = ContractorInvoice.builder()
                .purchaseOrder(po)
                .assignment(assignment)
                .contractor(contractor)
                .invoicePeriod(request.getInvoicePeriod())
                .hoursBilled(hoursBilled)
                .invoiceAmount(invoiceAmount)
                .submittedDate(LocalDateTime.now())
                .status(InvoiceStatus.SUBMITTED)
                .build();

        invoice = contractorInvoiceRepository.save(invoice);

        // Associate timesheets to invoice
        for (Timesheet ts : timesheets) {
            ts.setInvoice(invoice);
            timesheetRepository.save(ts);
        }

        // Update PO status if exhausted
        BigDecimal updatedPOBalance = remainingPOBalance.subtract(invoiceAmount);
        if (updatedPOBalance.compareTo(BigDecimal.ZERO) <= 0) {
            po.setStatus(PurchaseOrderStatus.EXHAUSTED);
            purchaseOrderRepository.save(po);
        }

        final ContractorInvoice savedInvoice = invoice;
        List<User> recipients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN || u.getRole() == UserRole.FINANCE)
                .collect(Collectors.toList());
        for (User r : recipients) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(r.getId())
                    .message(String.format("Invoice %s submitted and awaiting approval.", savedInvoice.getId()))
                    .category("INVOICE")
                    .notificationType("INVOICE_SUBMISSION")
                    .referenceEntityId(savedInvoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .build());
        }

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
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        List<ContractorInvoice> allInvoices = contractorInvoiceRepository.findAll();

        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return allInvoices.stream().map(this::mapToDto).collect(Collectors.toList());
        }

        if ("HIRING_MANAGER".equals(role)) {
            return allInvoices.stream()
                    .filter(inv -> inv.getAssignment().getHiringManager().getId().equals(currentUser.getId()))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            return allInvoices.stream()
                    .filter(inv -> (inv.getAssignment().getVendor() != null && inv.getAssignment().getVendor().getId().equals(currentUser.getId())) ||
                                   inv.getPurchaseOrder().getVendor().getId().equals(currentUser.getId()))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        if ("CONTRACTOR".equals(role)) {
            return allInvoices.stream()
                    .filter(inv -> inv.getContractor().getId().equals(currentUser.getId()))
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        throw new AccessDeniedException("Access Denied: You do not have permissions to view Invoices.");
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

        // Workflow Validation: Only SUBMITTED or DISPUTED can be approved
        if (invoice.getStatus() != InvoiceStatus.SUBMITTED && invoice.getStatus() != InvoiceStatus.DISPUTED) {
            throw new IllegalStateException("Invalid workflow transition: Cannot approve invoice in status " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.APPROVED);
        invoice = contractorInvoiceRepository.save(invoice);

        if (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getVendor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getPurchaseOrder().getVendor().getId())
                    .message(String.format("Your invoice %s has been approved.", invoice.getId()))
                    .category("INVOICE")
                    .notificationType("INVOICE_APPROVAL")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .build());
        }

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

        // Workflow Validation: Only SUBMITTED or DISPUTED can be rejected
        if (invoice.getStatus() != InvoiceStatus.SUBMITTED && invoice.getStatus() != InvoiceStatus.DISPUTED) {
            throw new IllegalStateException("Invalid workflow transition: Cannot reject invoice in status " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.REJECTED);
        invoice = contractorInvoiceRepository.save(invoice);

        // Workflow Action: Release associated timesheets back to uninvoiced state
        List<Timesheet> timesheets = timesheetRepository.findByAssignmentId(invoice.getAssignment().getId());
        for (Timesheet ts : timesheets) {
            if (ts.getInvoice() != null && ts.getInvoice().getId().equals(invoice.getId())) {
                ts.setInvoice(null);
                timesheetRepository.save(ts);
            }
        }

        // PO Control: Rejecting an invoice increases PO balance, if PO was EXHAUSTED, reactivate it
        PurchaseOrder po = invoice.getPurchaseOrder();
        if (po.getStatus() == PurchaseOrderStatus.EXHAUSTED) {
            BigDecimal remaining = getRemainingPOBalance(po);
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                po.setStatus(PurchaseOrderStatus.ACTIVE);
                purchaseOrderRepository.save(po);
            }
        }

        return mapToDto(invoice);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO disputeInvoice(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: ADMIN, FINANCE allowed to dispute
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin or Finance roles can dispute invoices.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        // Workflow Validation: Only SUBMITTED can be disputed
        if (invoice.getStatus() != InvoiceStatus.SUBMITTED) {
            throw new IllegalStateException("Invalid workflow transition: Cannot dispute invoice in status " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.DISPUTED);
        invoice = contractorInvoiceRepository.save(invoice);
        return mapToDto(invoice);
    }

    @Override
    @Transactional
    public ContractorInvoiceResponseDTO markInvoiceAsPaid(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        // RBAC: ADMIN, FINANCE allowed to mark paid
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin or Finance roles can mark invoices as paid.");
        }

        ContractorInvoice invoice = contractorInvoiceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found with ID: " + id));

        // Workflow Validation: Only APPROVED can transition to PAID
        if (invoice.getStatus() != InvoiceStatus.APPROVED) {
            throw new IllegalStateException("Invalid workflow transition: Cannot mark invoice in status " + invoice.getStatus() + " as PAID.");
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoice = contractorInvoiceRepository.save(invoice);

        if (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getVendor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getPurchaseOrder().getVendor().getId())
                    .message(String.format("Your invoice %s has been paid.", invoice.getId()))
                    .category("INVOICE")
                    .notificationType("INVOICE_PAID")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .build());
        }

        if (invoice.getContractor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getContractor().getId())
                    .message(String.format("Your invoice %s has been paid.", invoice.getId()))
                    .category("INVOICE")
                    .notificationType("INVOICE_PAID")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .build());
        }

        return mapToDto(invoice);
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
                    invoice.getPurchaseOrder().getVendor().getId().equals(currentUser.getId())) {
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

    private ContractorInvoiceResponseDTO mapToDto(ContractorInvoice invoice) {
        return ContractorInvoiceResponseDTO.builder()
                .id(invoice.getId())
                .poId(invoice.getPurchaseOrder().getId())
                .assignmentId(invoice.getAssignment().getId())
                .contractorId(invoice.getContractor().getId())
                .invoicePeriod(invoice.getInvoicePeriod())
                .hoursBilled(invoice.getHoursBilled())
                .invoiceAmount(invoice.getInvoiceAmount())
                .submittedDate(invoice.getSubmittedDate())
                .status(invoice.getStatus().name())
                .build();
    }
}

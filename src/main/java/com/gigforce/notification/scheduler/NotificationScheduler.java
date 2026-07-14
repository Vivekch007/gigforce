package com.gigforce.notification.scheduler;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.PurchaseOrder;
import com.gigforce.invoice.enums.PurchaseOrderStatus;
import com.gigforce.invoice.repository.ContractorInvoiceRepository;
import com.gigforce.invoice.repository.PurchaseOrderRepository;
import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
public class NotificationScheduler {

    private final AssignmentRepository assignmentRepository;
    private final ContractorCertificationRepository certificationRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ContractorInvoiceRepository contractorInvoiceRepository;
    private final NotificationService notificationService;

    public NotificationScheduler(
            AssignmentRepository assignmentRepository,
            ContractorCertificationRepository certificationRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            ContractorInvoiceRepository contractorInvoiceRepository,
            NotificationService notificationService) {
        this.assignmentRepository = assignmentRepository;
        this.certificationRepository = certificationRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.contractorInvoiceRepository = contractorInvoiceRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 0 * * ?") // Daily at midnight
    @Transactional
    public void checkAssignmentEndWarnings() {
        LocalDate today = LocalDate.now().getYear() == 2026 ? LocalDate.of(2026, 6, 14) : LocalDate.now();
        LocalDate limitDate = today.plusDays(14);

        // Find active or extended assignments ending within 14 days
        List<Assignment> assignments = assignmentRepository.findAll();
        for (Assignment a : assignments) {
            if ((a.getStatus() == AssignmentStatus.ACTIVE || a.getStatus() == AssignmentStatus.EXTENDED)
                    && a.getEndDate() != null
                    && !a.getEndDate().isBefore(today)
                    && !a.getEndDate().isAfter(limitDate)) {

                // Notify Contractor
                if (a.getContractorProfile() != null && a.getContractorProfile().getUser() != null) {
                    notificationService.createNotification(NotificationRequestDTO.builder()
                            .userId(a.getContractorProfile().getUser().getId())
                            .category("ASSIGNMENT")
                            .message(String.format("Assignment %s is ending on %s.", a.getId(), a.getEndDate()))
                            .notificationType("ASSIGNMENT_END_WARNING")
                            .referenceEntityId(a.getId())
                            .referenceEntityType("Assignment")
                            .build());
                }

                // Notify Hiring Manager
                if (a.getHiringManager() != null) {
                    notificationService.createNotification(NotificationRequestDTO.builder()
                            .userId(a.getHiringManager().getId())
                            .category("ASSIGNMENT")
                            .message(String.format("Assignment %s is ending on %s.", a.getId(), a.getEndDate()))
                            .notificationType("ASSIGNMENT_END_WARNING")
                            .referenceEntityId(a.getId())
                            .referenceEntityType("Assignment")
                            .build());
                }

                // Notify Vendor

            }
        }
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void checkCertificationExpiryWarnings() {
        LocalDate today = LocalDate.now().getYear() == 2026 ? LocalDate.of(2026, 6, 14) : LocalDate.now();
        LocalDate limitDate = today.plusDays(30);

        List<ContractorCertification> certs = certificationRepository.findAll();
        for (ContractorCertification c : certs) {
            if (c.getCertStatus() == CertificationStatus.VALID
                    && c.getExpiryDate() != null
                    && !c.getExpiryDate().isBefore(today)
                    && !c.getExpiryDate().isAfter(limitDate)) {

                if (c.getContractorProfile() != null && c.getContractorProfile().getUser() != null) {
                    notificationService.createNotification(NotificationRequestDTO.builder()
                            .userId(c.getContractorProfile().getUser().getId())
                            .category("COMPLIANCE")
                            .message(String.format("Certification %s is expiring on %s.", c.getName(), c.getExpiryDate()))
                            .notificationType("CERTIFICATION_EXPIRY_WARNING")
                            .referenceEntityId(c.getId())
                            .referenceEntityType("ContractorCertification")
                            .build());
                }
            }
        }
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void checkPurchaseOrderExhaustionWarnings() {
        List<PurchaseOrder> pos = purchaseOrderRepository.findAll();
        for (PurchaseOrder po : pos) {
            if (po.getStatus() == PurchaseOrderStatus.ACTIVE) {
                // Calculate remaining balance
                List<ContractorInvoice> invoices = contractorInvoiceRepository.findActiveInvoicesByPurchaseOrderId(po.getId());
                BigDecimal totalSpent = BigDecimal.ZERO;
                for (ContractorInvoice inv : invoices) {
                    totalSpent = totalSpent.add(inv.getInvoiceAmount());
                }
                BigDecimal remainingBalance = po.getPOAmount().subtract(totalSpent);
                BigDecimal threshold = po.getPOAmount().multiply(new BigDecimal("0.10"));

                if (remainingBalance.compareTo(threshold) <= 0) {
                    // Notify Vendor
                    if (po.getVendor() != null) {
                        notificationService.createNotification(NotificationRequestDTO.builder()
                                .userId(po.getVendor().getId())
                                .category("VENDOR")
                                .message(String.format("Purchase Order %s remaining balance is <= 10%%.", po.getId()))
                                .notificationType("PO_EXHAUSTION_WARNING")
                                .referenceEntityId(po.getId())
                                .referenceEntityType("PurchaseOrder")
                                .build());
                    }

                    // Notify Hiring Manager
                    if (po.getAssignment() != null && po.getAssignment().getHiringManager() != null) {
                        notificationService.createNotification(NotificationRequestDTO.builder()
                                .userId(po.getAssignment().getHiringManager().getId())
                                .category("VENDOR")
                                .message(String.format("Purchase Order %s remaining balance is <= 10%%.", po.getId()))
                                .notificationType("PO_EXHAUSTION_WARNING")
                                .referenceEntityId(po.getId())
                                .referenceEntityType("PurchaseOrder")
                                .build());
                    }
                }
            }
        }
    }
}

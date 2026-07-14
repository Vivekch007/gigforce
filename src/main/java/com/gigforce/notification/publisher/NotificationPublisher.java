package com.gigforce.notification.publisher;

import com.gigforce.identity.entity.User;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.Payment;
import com.gigforce.notification.dto.NotificationRequestDTO;
import com.gigforce.notification.service.NotificationService;
import com.gigforce.identity.enums.UserRole;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class NotificationPublisher {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationPublisher(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    public void publishInvoiceSubmission(ContractorInvoice invoice) {
        List<User> recipients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN || u.getRole() == UserRole.FINANCE)
                .collect(Collectors.toList());
        for (User r : recipients) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(r.getId())
                    .title("Invoice Submitted")
                    .message(String.format("Invoice %s submitted and awaiting approval.", invoice.getInvoiceNumber()))
                    .category("INVOICE")
                    .priority("MEDIUM")
                    .notificationType("INVOICE_SUBMISSION")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .orgUnitId(invoice.getOrgUnitId())
                    .build());
        }
    }

    public void publishUserRegistration(User user) {
        notificationService.createNotification(NotificationRequestDTO.builder()
                .userId(user.getId())
                .title("Welcome to GigForce")
                .message("Welcome to GigForce! Your account is now active.")
                .category("GENERAL")
                .priority("LOW")
                .notificationType("USER_REGISTRATION")
                .referenceEntityId(user.getId())
                .referenceEntityType("User")
                .orgUnitId(user.getOrgUnitId())
                .build());
    }

    public void publishProfileCompletion(ContractorProfile profile) {
        notificationService.createNotification(NotificationRequestDTO.builder()
                .userId(profile.getUser().getId())
                .title("Profile 100% Completed")
                .message("Congratulations! Your contractor profile is 100% complete and verified.")
                .category("COMPLIANCE")
                .priority("MEDIUM")
                .notificationType("PROFILE_COMPLETION")
                .referenceEntityId(profile.getId())
                .referenceEntityType("ContractorProfile")
                .orgUnitId(profile.getUser().getOrgUnitId())
                .build());
    }

    public void publishRequisitionPublished(ResourceRequisition requisition) {
        notificationService.createNotification(NotificationRequestDTO.builder()
                .userId(requisition.getCreator().getId())
                .title("Requisition Published")
                .message(String.format("Your requisition '%s' is now published.", requisition.getTitle()))
                .category("ASSIGNMENT")
                .priority("LOW")
                .notificationType("REQUISITION_PUBLISHED")
                .referenceEntityId(requisition.getId())
                .referenceEntityType("ResourceRequisition")
                .orgUnitId(requisition.getOrgUnitId())
                .build());

        List<User> vendors = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.VENDOR || u.getRole() == UserRole.VENDOR_MANAGER)
                .collect(Collectors.toList());

        for (User vendor : vendors) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(vendor.getId())
                    .title("New Requisition Open")
                    .message(String.format("A new requisition is open for submissions: %s", requisition.getTitle()))
                    .category("VENDOR")
                    .priority("MEDIUM")
                    .notificationType("NEW_REQUISITION")
                    .referenceEntityId(requisition.getId())
                    .referenceEntityType("ResourceRequisition")
                    .orgUnitId(requisition.getOrgUnitId())
                    .build());
        }
    }

    public void publishAssignmentCreated(Assignment assignment) {
        if (assignment.getContractorProfile() != null && assignment.getContractorProfile().getUser() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(assignment.getContractorProfile().getUser().getId())
                    .title("New Assignment Created")
                    .message(String.format("You have been assigned to assignment %s.", assignment.getId()))
                    .category("ASSIGNMENT")
                    .priority("HIGH")
                    .notificationType("ASSIGNMENT_CREATED")
                    .referenceEntityId(assignment.getId())
                    .referenceEntityType("Assignment")
                    .orgUnitId(assignment.getOrgUnitId())
                    .build());
        }
    }

    public void publishAssignmentCompleted(Assignment assignment) {
        if (assignment.getContractorProfile() != null && assignment.getContractorProfile().getUser() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(assignment.getContractorProfile().getUser().getId())
                    .title("Assignment Completed")
                    .message(String.format("Your assignment %s has been completed.", assignment.getId()))
                    .category("ASSIGNMENT")
                    .priority("MEDIUM")
                    .notificationType("ASSIGNMENT_COMPLETED")
                    .referenceEntityId(assignment.getId())
                    .referenceEntityType("Assignment")
                    .orgUnitId(assignment.getOrgUnitId())
                    .build());
        }
    }

    public void publishTimesheetSubmission(Timesheet timesheet) {
        if (timesheet.getAssignment() != null && timesheet.getAssignment().getHiringManager() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(timesheet.getAssignment().getHiringManager().getId())
                    .title("Timesheet Submitted")
                    .message(String.format("Timesheet %s submitted and awaiting approval.", timesheet.getId()))
                    .category("TIMESHEET")
                    .priority("MEDIUM")
                    .notificationType("TIMESHEET_SUBMISSION")
                    .referenceEntityId(timesheet.getId())
                    .referenceEntityType("Timesheet")
                    .orgUnitId(timesheet.getOrgUnitId())
                    .build());
        }
    }

    public void publishTimesheetL1Approval(Timesheet timesheet, User approver) {
        List<User> financeUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.FINANCE)
                .collect(Collectors.toList());

        for (User finance : financeUsers) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(finance.getId())
                    .title("Timesheet Awaiting L2 Review")
                    .message(String.format("Timesheet %s approved by Hiring Manager and awaiting Finance review.", timesheet.getId()))
                    .category("TIMESHEET")
                    .priority("MEDIUM")
                    .notificationType("TIMESHEET_L1_APPROVED")
                    .referenceEntityId(timesheet.getId())
                    .referenceEntityType("Timesheet")
                    .orgUnitId(timesheet.getOrgUnitId())
                    .build());
        }

        if (timesheet.getContractor() != null && timesheet.getContractor().getUser() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(timesheet.getContractor().getUser().getId())
                    .title("Timesheet L1 Approved")
                    .message(String.format("Your timesheet %s has received L1 approval.", timesheet.getId()))
                    .category("TIMESHEET")
                    .priority("LOW")
                    .notificationType("TIMESHEET_L1_APPROVED")
                    .referenceEntityId(timesheet.getId())
                    .referenceEntityType("Timesheet")
                    .orgUnitId(timesheet.getOrgUnitId())
                    .build());
        }
    }

    public void publishTimesheetL2Approval(Timesheet timesheet, User approver) {
        if (timesheet.getContractor() != null && timesheet.getContractor().getUser() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(timesheet.getContractor().getUser().getId())
                    .title("Timesheet Fully Approved")
                    .message(String.format("Your timesheet %s has been fully approved.", timesheet.getId()))
                    .category("TIMESHEET")
                    .priority("MEDIUM")
                    .notificationType("TIMESHEET_APPROVED")
                    .referenceEntityId(timesheet.getId())
                    .referenceEntityType("Timesheet")
                    .orgUnitId(timesheet.getOrgUnitId())
                    .build());
        }
    }

    public void publishTimesheetRejection(Timesheet timesheet, User approver) {
        if (timesheet.getContractor() != null && timesheet.getContractor().getUser() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(timesheet.getContractor().getUser().getId())
                    .title("Timesheet Rejected")
                    .message(String.format("Your timesheet %s has been rejected.", timesheet.getId()))
                    .category("TIMESHEET")
                    .priority("HIGH")
                    .notificationType("TIMESHEET_REJECTION")
                    .referenceEntityId(timesheet.getId())
                    .referenceEntityType("Timesheet")
                    .orgUnitId(timesheet.getOrgUnitId())
                    .build());
        }
    }

    public void publishInvoiceApproval(ContractorInvoice invoice) {
        if (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getVendor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getPurchaseOrder().getVendor().getId())
                    .title("Invoice Approved")
                    .message(String.format("Invoice %s has been approved.", invoice.getInvoiceNumber()))
                    .category("INVOICE")
                    .priority("MEDIUM")
                    .notificationType("INVOICE_APPROVAL")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .orgUnitId(invoice.getOrgUnitId())
                    .build());
        }
    }

    public void publishInvoiceRejection(ContractorInvoice invoice) {
        if (invoice.getAssignment() != null && invoice.getAssignment().getHiringManager() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getAssignment().getHiringManager().getId())
                    .title("Invoice Rejected")
                    .message(String.format("Invoice %s has been rejected.", invoice.getInvoiceNumber()))
                    .category("INVOICE")
                    .priority("HIGH")
                    .notificationType("INVOICE_REJECTION")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .orgUnitId(invoice.getOrgUnitId())
                    .build());
        }

        if (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getVendor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getPurchaseOrder().getVendor().getId())
                    .title("Invoice Rejected")
                    .message(String.format("Invoice %s has been rejected.", invoice.getInvoiceNumber()))
                    .category("INVOICE")
                    .priority("HIGH")
                    .notificationType("INVOICE_REJECTION")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .orgUnitId(invoice.getOrgUnitId())
                    .build());
        }
    }

    public void publishPaymentCompletion(Payment payment) {
        ContractorInvoice invoice = payment.getInvoice();
        if (invoice == null) return;

        if (invoice.getPurchaseOrder() != null && invoice.getPurchaseOrder().getVendor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getPurchaseOrder().getVendor().getId())
                    .title("Invoice Paid")
                    .message(String.format("Your invoice %s has been paid.", invoice.getInvoiceNumber()))
                    .category("INVOICE")
                    .priority("MEDIUM")
                    .notificationType("INVOICE_PAID")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .orgUnitId(invoice.getOrgUnitId())
                    .build());
        }

        if (invoice.getContractor() != null) {
            notificationService.createNotification(NotificationRequestDTO.builder()
                    .userId(invoice.getContractor().getId())
                    .title("Invoice Paid")
                    .message(String.format("Your invoice %s has been paid.", invoice.getInvoiceNumber()))
                    .category("INVOICE")
                    .priority("MEDIUM")
                    .notificationType("INVOICE_PAID")
                    .referenceEntityId(invoice.getId())
                    .referenceEntityType("ContractorInvoice")
                    .orgUnitId(invoice.getOrgUnitId())
                    .build());
        }
    }

    public void publishContractorSuspended(User user) {
        notificationService.createNotification(NotificationRequestDTO.builder()
                .userId(user.getId())
                .title("Account Suspended")
                .message("Your account has been suspended by an administrator.")
                .category("GENERAL")
                .priority("HIGH")
                .notificationType("USER_SUSPENDED")
                .referenceEntityId(user.getId())
                .referenceEntityType("User")
                .orgUnitId(user.getOrgUnitId())
                .build());
    }

    public void publishContractorReactivated(User user) {
        notificationService.createNotification(NotificationRequestDTO.builder()
                .userId(user.getId())
                .title("Account Activated")
                .message("Your account has been reactivated successfully.")
                .category("GENERAL")
                .priority("MEDIUM")
                .notificationType("USER_ACTIVATED")
                .referenceEntityId(user.getId())
                .referenceEntityType("User")
                .orgUnitId(user.getOrgUnitId())
                .build());
    }
}

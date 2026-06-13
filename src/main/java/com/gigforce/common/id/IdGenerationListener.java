package com.gigforce.common.id;

import com.gigforce.common.util.ApplicationContextHolder;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import jakarta.persistence.PrePersist;

public class IdGenerationListener {

    @PrePersist
    public void setId(Object entity) {
        try {
            com.gigforce.common.id.IdGeneratorService generator = ApplicationContextHolder
                    .getBean(IdGeneratorService.class);
            if (entity instanceof com.gigforce.common.entity.BaseEntity base) {
                if (base.getId() == null) {
                    String prefix = determinePrefix(entity);
                    String id = generator.generateId(prefix);
                    base.setId(id);
                }
            }
        } catch (Exception e) {
            // If id generation fails, let persistence proceed (or throw – for now we
            // swallow to avoid blocking startup)
        }
    }

    private String determinePrefix(Object entity) {
        if (entity instanceof User user) {
            UserRole role = user.getRole();
            if (role == null)
                return "usr";
            return switch (role) {
                case ADMIN -> "adm";
                case CONTRACTOR -> "cnt";
                case HIRING_MANAGER -> "hr";
                case VENDOR -> "ven";
                case VENDOR_MANAGER -> "vm";
                case FINANCE -> "fin";
            };
        }

        if (entity instanceof com.gigforce.identity.entity.ContractorProfile) {
            return "cp";
        }
        if (entity instanceof com.gigforce.identity.entity.ContractorCertification) {
            return "cert";
        }
        if (entity instanceof com.gigforce.identity.entity.ContractorAbsence) {
            return "abs";
        }
        if (entity instanceof com.gigforce.identity.entity.ContractorSkill) {
            return "csk";
        }
        if (entity instanceof com.gigforce.identity.entity.EngagementHistory) {
            return "eng";
        }
        if (entity instanceof com.gigforce.assignment.entity.Assignment) {
            return "asn";
        }
        if (entity instanceof com.gigforce.assignment.entity.AssignmentAmendment) {
            return "asm";
        }
        if (entity instanceof com.gigforce.assignment.entity.Timesheet) {
            return "tsm";
        }
        if (entity instanceof com.gigforce.assignment.entity.TimesheetApproval) {
            return "tsa";
        }
        if (entity instanceof com.gigforce.assignment.entity.TimesheetComment) {
            return "tsc";
        }
        if (entity instanceof com.gigforce.assignment.entity.TimesheetLine) {
            return "tsl";
        }
        if (entity instanceof com.gigforce.audit.entity.AuditLog) {
            return "aud";
        }
        if (entity instanceof com.gigforce.identity.entity.Skill) {
            return "sk";
        }
        if (entity instanceof com.gigforce.requisition.entity.ResourceRequisition) {
            return "req";
        }
        if (entity instanceof com.gigforce.requisition.entity.VendorSubmission) {
            return "vsb";
        }

        return "id";
    }
}

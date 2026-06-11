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
        // mapping for common entities by class simple name
        String cls = entity.getClass().getSimpleName().toLowerCase();
        // ContractorProfile should use a distinct prefix from generic contractor/user
        if (cls.contains("contractorprofile") || cls.equals("contractorprofile"))
            return "cp";
        if (cls.contains("contractor"))
            return "cnt";
        if (cls.contains("assignment"))
            return "asn";
        if (cls.contains("skill"))
            return "sk";
        if (cls.contains("timesheet"))
            return "tsm";
        if (cls.contains("vendor"))
            return "ven";
        if (cls.contains("requisition") || cls.contains("resource"))
            return "req";
        if (cls.contains("audit"))
            return "aud";
        return "id";
    }
}

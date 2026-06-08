package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.OrganizationNotFoundException;
import com.gigforce.identity.entity.Organization;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.OrganizationRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public OrganizationServiceImpl(
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public Organization createOrganization(String name, String code, String status) {
        if (organizationRepository.existsByCode(code)) {
            throw new IllegalArgumentException("Organization code already exists: " + code);
        }
        Organization org = Organization.builder()
                .name(name)
                .code(code)
                .status(status != null ? status : "ACTIVE")
                .build();
        
        Organization savedOrg = organizationRepository.save(org);

        // Fetch current performing user email for auditing
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = actor != null ? actor.getId() : 0L;

        auditService.logAction(
                actorId,
                "ORGANIZATION_CREATED",
                "ORGANIZATION",
                savedOrg.getId(),
                String.format("Organization %s (%s) created successfully", savedOrg.getName(), savedOrg.getCode())
        );

        return savedOrg;
    }

    @Override
    public Organization getById(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new OrganizationNotFoundException("Organization not found with ID: " + id));
    }

    @Override
    public Optional<Organization> getByCode(String code) {
        return organizationRepository.findByCode(code);
    }

    @Override
    public List<Organization> getAll() {
        return organizationRepository.findAll();
    }

    @Override
    @Transactional
    public Organization updateOrganization(Long id, String name, String status) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new OrganizationNotFoundException("Organization not found with ID: " + id));

        String oldName = org.getName();
        String oldStatus = org.getStatus();

        if (name != null && !name.trim().isEmpty()) {
            org.setName(name);
        }
        if (status != null && !status.trim().isEmpty()) {
            org.setStatus(status);
        }

        Organization updatedOrg = organizationRepository.save(org);

        // Fetch current performing user email for auditing
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = actor != null ? actor.getId() : 0L;

        auditService.logAction(
                actorId,
                "ORGANIZATION_UPDATED",
                "ORGANIZATION",
                updatedOrg.getId(),
                String.format("Organization details updated. Name: '%s'->'%s', Status: '%s'->'%s'",
                        oldName, updatedOrg.getName(), oldStatus, updatedOrg.getStatus())
        );

        return updatedOrg;
    }
}

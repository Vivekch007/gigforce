package com.gigforce.requisition.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.RequisitionNotFoundException;
import com.gigforce.exception.SkillNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.dto.ResourceRequisitionRequestDTO;
import com.gigforce.requisition.dto.ResourceRequisitionResponseDTO;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.enums.BusinessUnits;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.enums.ExperienceLevel;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.gigforce.security.CurrentUserContext;
import com.gigforce.exception.BusinessValidationException;

import java.math.BigDecimal;

import com.gigforce.notification.publisher.NotificationPublisher;

@Service
@Transactional(readOnly = true)
public class ResourceRequisitionServiceImpl implements ResourceRequisitionService {

    private final ResourceRequisitionRepository requisitionRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final CurrentUserContext currentUserContext;
    private final NotificationPublisher notificationPublisher;
    private final VendorSubmissionRepository submissionRepository;

    public ResourceRequisitionServiceImpl(
            ResourceRequisitionRepository requisitionRepository,
            SkillRepository skillRepository,
            UserRepository userRepository,
            AuditService auditService,
            CurrentUserContext currentUserContext,
            NotificationPublisher notificationPublisher,
            VendorSubmissionRepository submissionRepository) {
        this.requisitionRepository = requisitionRepository;
        this.skillRepository = skillRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.currentUserContext = currentUserContext;
        this.notificationPublisher = notificationPublisher;
        this.submissionRepository = submissionRepository;
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO createRequisition(ResourceRequisitionRequestDTO request) {
        validateRequest(request);

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        String role = currentUserContext.getCurrentUserRole();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new BusinessValidationException("Creator must be HIRING_MANAGER or ADMIN");
        }
        String orgUnitId = currentUserContext.getCurrentUserOrgUnitId();
        if (orgUnitId == null || orgUnitId.trim().isEmpty()) {
            throw new BusinessValidationException("Creator must belong to an Organization");
        }

        Skill skill = skillRepository.findById(request.getRequiredSkillId())
                .orElseThrow(
                        () -> new SkillNotFoundException("Skill not found with ID: " + request.getRequiredSkillId()));
        BusinessUnits businessUnits = null;
        if (request.getBusinessUnitId() != null) {
            try {
                businessUnits = BusinessUnits.valueOf(request.getBusinessUnitId().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessValidationException("businessUnitId must be one of: " + java.util.Arrays.toString(BusinessUnits.values()));
            }
        }
        ResourceRequisition requisition = ResourceRequisition.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .requiredSkill(skill)
                .minExperienceYears(request.getMinExperienceYears())
                .maxHourlyRate(request.getMaxHourlyRate())
                .quantity(request.getQuantity())
                .status(RequisitionStatus.DRAFT)
                .creator(currentUser)
                .orgUnitId(orgUnitId)
                .engagementType(request.getEngagementType() != null ? request.getEngagementType() : EngagementType.HYBRID)
                .experienceLevel(request.getExperienceLevel() != null ? request.getExperienceLevel() : ExperienceLevel.MID)
                .startDate(request.getStartDate() != null ? request.getStartDate() : java.time.LocalDate.now())
                .duration(request.getDuration() != null ? request.getDuration().trim() : "6 months")
                .businessUnitId(businessUnits != null ? businessUnits.name() : null)
                .customDepartment(request.getCustomDepartment() != null ? request.getCustomDepartment().trim() : null)
                .build();

        ResourceRequisition saved = requisitionRepository.save(requisition);

        auditService.logAction(
                currentUser.getId(),
                "REQUISITION_CREATED",
                "ResourceRequisition",
                saved.getId(),
                String.format("Requisition '%s' created in DRAFT status by %s", saved.getTitle(),
                        currentUser.getEmail()));

        return toDto(saved);
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO updateRequisition(String id, ResourceRequisitionRequestDTO request) {
        validateRequest(request);

        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));

        if (requisition.getStatus() != RequisitionStatus.DRAFT) {
            throw new BusinessValidationException("Requisition can only be updated while in DRAFT status.");
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !requisition.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to update this requisition.");
        }

        Skill skill = skillRepository.findById(request.getRequiredSkillId())
                .orElseThrow(
                        () -> new SkillNotFoundException("Skill not found with ID: " + request.getRequiredSkillId()));

        requisition.setTitle(request.getTitle().trim());
        requisition.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        requisition.setRequiredSkill(skill);
        requisition.setMinExperienceYears(request.getMinExperienceYears());
        requisition.setMaxHourlyRate(request.getMaxHourlyRate());
        requisition.setQuantity(request.getQuantity());
        requisition.setEngagementType(request.getEngagementType() != null ? request.getEngagementType() : EngagementType.HYBRID);
        requisition.setExperienceLevel(request.getExperienceLevel() != null ? request.getExperienceLevel() : ExperienceLevel.MID);
        requisition.setStartDate(request.getStartDate() != null ? request.getStartDate() : java.time.LocalDate.now());
        requisition.setDuration(request.getDuration() != null ? request.getDuration().trim() : "6 months");
        BusinessUnits businessUnits = null;
        if (request.getBusinessUnitId() != null) {
            try {
                businessUnits = BusinessUnits.valueOf(request.getBusinessUnitId().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessValidationException("businessUnitId must be one of: " + java.util.Arrays.toString(BusinessUnits.values()));
            }
        }
        requisition.setBusinessUnitId(businessUnits != null ? businessUnits.name() : null);
        requisition.setCustomDepartment(request.getCustomDepartment() != null ? request.getCustomDepartment().trim() : null);

        ResourceRequisition updated = requisitionRepository.save(requisition);

        auditService.logAction(
                currentUser.getId(),
                "REQUISITION_UPDATED",
                "ResourceRequisition",
                updated.getId(),
                String.format("Requisition '%s' updated by %s", updated.getTitle(), currentUser.getEmail()));

        return toDto(updated);
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO publishRequisition(String id) {
        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));

        RequisitionStatus oldStatus = requisition.getStatus();
        validateRequisitionStatusTransition(oldStatus, RequisitionStatus.OPEN);

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !requisition.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to publish this requisition.");
        }

        requisition.setStatus(RequisitionStatus.OPEN);
        ResourceRequisition updated = requisitionRepository.save(requisition);

        auditService.logAction(
                currentUser.getId(),
                "REQUISITION_STATUS_CHANGED",
                "ResourceRequisition",
                updated.getId(),
                String.format("Requisition '%s' published (%s -> OPEN) by %s", updated.getTitle(), oldStatus,
                        currentUser.getEmail()));

        notificationPublisher.publishRequisitionPublished(updated);

        return toDto(updated);
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO cancelRequisition(String id) {
        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));

        RequisitionStatus oldStatus = requisition.getStatus();
        validateRequisitionStatusTransition(oldStatus, RequisitionStatus.CANCELLED);

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !requisition.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to cancel this requisition.");
        }

        requisition.setStatus(RequisitionStatus.CANCELLED);
        ResourceRequisition updated = requisitionRepository.save(requisition);

        auditService.logAction(
                currentUser.getId(),
                "REQUISITION_STATUS_CHANGED",
                "ResourceRequisition",
                updated.getId(),
                String.format("Requisition '%s' cancelled (%s -> CANCELLED) by %s", updated.getTitle(), oldStatus,
                        currentUser.getEmail()));

        return toDto(updated);
    }

    @Override
    public ResourceRequisitionResponseDTO getRequisitionById(String id) {
        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));
        validateRequisitionViewAccess(requisition);
        return toDto(requisition);
    }

    /**
     * Enforces the same visibility rules as search on the single-GET path:
     * ADMIN/FINANCE see all; HR only their org; Vendors only OPEN requisitions or ones
     * their org has submitted to; Contractors only OPEN. Prevents reading DRAFT / other-org
     * requisitions by ID.
     */
    private void validateRequisitionViewAccess(ResourceRequisition requisition) {
        String role = currentUserContext.getCurrentUserRole();
        if ("ADMIN".equals(role) || "FINANCE".equals(role)) {
            return;
        }
        if ("HIRING_MANAGER".equals(role)) {
            String org = currentUserContext.getCurrentUserOrgUnitId();
            if (org != null && org.equals(requisition.getOrgUnitId())) {
                return;
            }
            throw new AccessDeniedException("Access Denied: You can only view requisitions in your own organization.");
        }
        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            if (requisition.getStatus() == RequisitionStatus.OPEN) {
                return;
            }
            String org = currentUserContext.getCurrentUserOrgUnitId();
            if (org != null && submissionRepository.existsByRequisitionIdAndSubmittedBy_OrgUnitId(requisition.getId(), org)) {
                return;
            }
            throw new AccessDeniedException(
                    "Access Denied: Vendors can only view OPEN requisitions or ones they have submitted to.");
        }
        if ("CONTRACTOR".equals(role)) {
            if (requisition.getStatus() == RequisitionStatus.OPEN) {
                return;
            }
            throw new AccessDeniedException("Access Denied: Contractors can only view OPEN requisitions.");
        }
        throw new AccessDeniedException("Access Denied: You are not permitted to view this requisition.");
    }

    @Override
    public Page<ResourceRequisitionResponseDTO> searchRequisitions(
            String requisitionId,
            String jobTitle,
            RequisitionStatus status,
            String requiredSkillId,
            String hiringManager,
            String orgUnitId,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(page, size);
        Specification<ResourceRequisition> spec = Specification.where(null);

        // Fetch join creator and requiredSkill to avoid N+1 queries
        spec = spec.and((root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("creator", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("requiredSkill", jakarta.persistence.criteria.JoinType.LEFT);
            }
            return null;
        });

        // 1. Role-based Tenant Isolation
        String currentRole = currentUserContext.getCurrentUserRole();
        String currentOrgUnitId = currentUserContext.getCurrentUserOrgUnitId();

        if ("HIRING_MANAGER".equals(currentRole)) {
            // Can only see their own organization's requisitions
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), currentOrgUnitId));
        } else if ("VENDOR".equals(currentRole) || "VENDOR_MANAGER".equals(currentRole)) {
            // Vendors should NEVER see DRAFT requisitions
            spec = spec.and((root, query, cb) -> cb.notEqual(root.get("status"), RequisitionStatus.DRAFT));
            
            // Vendors only see OPEN requisitions OR requisitions assigned to their vendor (where they sowed/submitted candidates)
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Subquery<String> subquery = query.subquery(String.class);
                jakarta.persistence.criteria.Root<com.gigforce.requisition.entity.VendorSubmission> vsRoot = subquery.from(com.gigforce.requisition.entity.VendorSubmission.class);
                subquery.select(vsRoot.get("requisition").get("id"))
                        .where(cb.and(
                            cb.equal(vsRoot.get("requisition").get("id"), root.get("id")),
                            cb.equal(vsRoot.get("submittedBy").get("orgUnitId"), currentOrgUnitId)
                        ));
                
                return cb.or(
                    cb.equal(root.get("status"), RequisitionStatus.OPEN),
                    cb.exists(subquery)
                );
            });
        }

        // 2. Search Filters
        if (requisitionId != null && !requisitionId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), requisitionId.trim()));
        }

        if (jobTitle != null && !jobTitle.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("title")), "%" + jobTitle.trim().toLowerCase() + "%"));
        }

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (requiredSkillId != null && !requiredSkillId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("requiredSkill").get("id"), requiredSkillId.trim()));
        }

        if (hiringManager != null && !hiringManager.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("creator").get("name")), "%" + hiringManager.trim().toLowerCase() + "%"));
        }

        if (orgUnitId != null && !orgUnitId.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("orgUnitId"), orgUnitId.trim()));
        }

        return requisitionRepository.findAll(spec, pageable).map(this::toDto);
    }

    private void validateRequest(ResourceRequisitionRequestDTO request) {
        if (request.getQuantity() != null && request.getQuantity() < 1) {
            throw new BusinessValidationException("Quantity must be at least 1.");
        }
        if (request.getMinExperienceYears() != null && request.getMinExperienceYears() < 0) {
            throw new BusinessValidationException("Minimum experience years must be 0 or greater.");
        }
        if (request.getMaxHourlyRate() != null && request.getMaxHourlyRate().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Maximum hourly rate must be positive.");
        }
        if (request.getStartDate() != null && request.getStartDate().isBefore(java.time.LocalDate.now())) {
            throw new BusinessValidationException("Start date cannot be in the past.");
        }
    }

    private ResourceRequisitionResponseDTO toDto(ResourceRequisition requisition) {
        return ResourceRequisitionResponseDTO.builder()
                .id(requisition.getId())
                .title(requisition.getTitle())
                .description(requisition.getDescription())
                .requiredSkillId(requisition.getRequiredSkill().getId())
                .requiredSkillName(requisition.getRequiredSkill().getName())
                .minExperienceYears(requisition.getMinExperienceYears())
                .maxHourlyRate(requisition.getMaxHourlyRate())
                .quantity(requisition.getQuantity())
                .status(requisition.getStatus())
                .creatorId(requisition.getCreator().getId())
                .creatorEmail(requisition.getCreator().getEmail())
                .engagementType(requisition.getEngagementType())
                .experienceLevel(requisition.getExperienceLevel())
                .startDate(requisition.getStartDate())
                .duration(requisition.getDuration())
                .businessUnitId(requisition.getBusinessUnitId())
                .customDepartment(requisition.getCustomDepartment())
                .createdAt(requisition.getCreatedAt())
                .updatedAt(requisition.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO closeRequisition(String id) {
        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !requisition.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to close this requisition.");
        }

        RequisitionStatus oldStatus = requisition.getStatus();
        validateRequisitionStatusTransition(oldStatus, RequisitionStatus.CLOSED);
        requisition.setStatus(RequisitionStatus.CLOSED);
        ResourceRequisition updated = requisitionRepository.save(requisition);

        auditService.logAction(
                currentUser.getId(),
                "REQUISITION_STATUS_CHANGED",
                "ResourceRequisition",
                updated.getId(),
                String.format("Requisition '%s' closed (%s -> CLOSED) by %s", updated.getTitle(), oldStatus,
                        currentUser.getEmail()));

        notificationPublisher.publishRequisitionClosed(updated);

        return toDto(updated);
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO underReviewRequisition(String id) {
        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !requisition.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to put this requisition under review.");
        }

        RequisitionStatus oldStatus = requisition.getStatus();
        validateRequisitionStatusTransition(oldStatus, RequisitionStatus.UNDER_REVIEW);
        requisition.setStatus(RequisitionStatus.UNDER_REVIEW);
        ResourceRequisition updated = requisitionRepository.save(requisition);

        auditService.logAction(
                currentUser.getId(),
                "REQUISITION_STATUS_CHANGED",
                "ResourceRequisition",
                updated.getId(),
                String.format("Requisition '%s' put under review (%s -> UNDER_REVIEW) by %s", updated.getTitle(), oldStatus,
                        currentUser.getEmail()));

        return toDto(updated);
    }

    private void validateRequisitionStatusTransition(RequisitionStatus current, RequisitionStatus target) {
        if (current == target) {
            return;
        }
        boolean valid = false;
        switch (current) {
            case DRAFT:
                valid = target == RequisitionStatus.OPEN || target == RequisitionStatus.CANCELLED;
                break;
            case OPEN:
                valid = target == RequisitionStatus.UNDER_REVIEW 
                        || target == RequisitionStatus.FILLED 
                        || target == RequisitionStatus.CANCELLED;
                break;
            case UNDER_REVIEW:
                valid = target == RequisitionStatus.FILLED 
                        || target == RequisitionStatus.CANCELLED;
                break;
            case FILLED:
                valid = target == RequisitionStatus.CLOSED;
                break;
            case CLOSED:
            case CANCELLED:
                valid = false;
                break;
        }
        if (!valid) {
            throw new BusinessValidationException("Invalid requisition status transition from " + current + " to " + target);
        }
    }
}

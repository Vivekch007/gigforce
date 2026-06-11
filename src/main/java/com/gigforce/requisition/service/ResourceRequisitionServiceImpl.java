package com.gigforce.requisition.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.RequisitionNotFoundException;
import com.gigforce.exception.SkillNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.requisition.dto.ResourceRequisitionRequestDTO;
import com.gigforce.requisition.dto.ResourceRequisitionResponseDTO;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@Transactional(readOnly = true)
public class ResourceRequisitionServiceImpl implements ResourceRequisitionService {

    private final ResourceRequisitionRepository requisitionRepository;
    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ResourceRequisitionServiceImpl(
            ResourceRequisitionRepository requisitionRepository,
            SkillRepository skillRepository,
            UserRepository userRepository,
            AuditService auditService) {
        this.requisitionRepository = requisitionRepository;
        this.skillRepository = skillRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO createRequisition(ResourceRequisitionRequestDTO request) {
        validateRequest(request);

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        Skill skill = skillRepository.findById(request.getRequiredSkillId())
                .orElseThrow(
                        () -> new SkillNotFoundException("Skill not found with ID: " + request.getRequiredSkillId()));

        ResourceRequisition requisition = ResourceRequisition.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .requiredSkill(skill)
                .minExperienceYears(request.getMinExperienceYears())
                .maxHourlyRate(request.getMaxHourlyRate())
                .quantity(request.getQuantity())
                .status(RequisitionStatus.DRAFT)
                .creator(currentUser)
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
            throw new IllegalArgumentException("Requisition can only be updated while in DRAFT status.");
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

        if (requisition.getStatus() != RequisitionStatus.DRAFT) {
            throw new IllegalArgumentException("Requisition can only be published while in DRAFT status.");
        }

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
                String.format("Requisition '%s' published (DRAFT -> OPEN) by %s", updated.getTitle(),
                        currentUser.getEmail()));

        return toDto(updated);
    }

    @Override
    @Transactional
    public ResourceRequisitionResponseDTO cancelRequisition(String id) {
        ResourceRequisition requisition = requisitionRepository.findById(id)
                .orElseThrow(() -> new RequisitionNotFoundException("Requisition not found with ID: " + id));

        if (requisition.getStatus() == RequisitionStatus.CANCELLED
                || requisition.getStatus() == RequisitionStatus.FILLED) {
            throw new IllegalArgumentException(
                    "Requisition is already in " + requisition.getStatus() + " status and cannot be cancelled.");
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + currentUsername));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        if (!isAdmin && !requisition.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access Denied: You are not authorized to cancel this requisition.");
        }

        RequisitionStatus oldStatus = requisition.getStatus();
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
        return toDto(requisition);
    }

    @Override
    public Page<ResourceRequisitionResponseDTO> searchRequisitions(
            RequisitionStatus status, String requiredSkillId, BigDecimal maxRate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return requisitionRepository.searchRequisitions(status, requiredSkillId, maxRate, pageable)
                .map(this::toDto);
    }

    private void validateRequest(ResourceRequisitionRequestDTO request) {
        if (request.getQuantity() != null && request.getQuantity() < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1.");
        }
        if (request.getMinExperienceYears() != null && request.getMinExperienceYears() < 0) {
            throw new IllegalArgumentException("Minimum experience years must be 0 or greater.");
        }
        if (request.getMaxHourlyRate() != null && request.getMaxHourlyRate().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Maximum hourly rate must be positive.");
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
                .createdAt(requisition.getCreatedAt())
                .updatedAt(requisition.getUpdatedAt())
                .build();
    }
}

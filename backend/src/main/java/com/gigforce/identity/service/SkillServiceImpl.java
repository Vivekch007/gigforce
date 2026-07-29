package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.DuplicateSkillException;
import com.gigforce.identity.dto.SkillRequestDTO;
import com.gigforce.identity.dto.SkillResponseDTO;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SkillServiceImpl implements SkillService {

    private final SkillRepository skillRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public SkillServiceImpl(SkillRepository skillRepository, UserRepository userRepository, AuditService auditService) {
        this.skillRepository = skillRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public SkillResponseDTO createSkill(SkillRequestDTO request) {
        if (skillRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new DuplicateSkillException("Skill with name '" + request.getName().trim() + "' already exists.");
        }

        Skill skill = Skill.builder()
                .name(request.getName().trim())
                .category(request.getCategory().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .build();

        Skill savedSkill = skillRepository.save(skill);

        // Fetch current actor email
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : null;

        // Log audit event
        auditService.logAction(
                actorId,
                "SKILL_CREATED",
                "Skill",
                savedSkill.getId(),
                "Master skill created: " + savedSkill.getName() + " under category: " + savedSkill.getCategory());

        return toDto(savedSkill);
    }

    @Override
    public List<SkillResponseDTO> getAllSkills(String category, String name) {
        org.springframework.data.jpa.domain.Specification<Skill> spec = org.springframework.data.jpa.domain.Specification.where(null);

        if (category != null && !category.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase()));
        }

        if (name != null && !name.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), "%" + name.trim().toLowerCase() + "%"));
        }

        return skillRepository.findAll(spec).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private SkillResponseDTO toDto(Skill skill) {
        return SkillResponseDTO.builder()
                .id(skill.getId())
                .name(skill.getName())
                .category(skill.getCategory())
                .description(skill.getDescription())
                .build();
    }
}

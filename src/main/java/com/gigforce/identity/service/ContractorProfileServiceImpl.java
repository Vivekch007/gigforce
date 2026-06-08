package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.DuplicateProfileException;
import com.gigforce.exception.DuplicateSkillException;
import com.gigforce.exception.SkillNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.dto.ContractorProfileRequestDTO;
import com.gigforce.identity.dto.ContractorProfileResponseDTO;
import com.gigforce.identity.dto.ContractorSkillRequestDTO;
import com.gigforce.identity.dto.ContractorSkillResponseDTO;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.ContractorSkill;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.ContractorStatus;
import com.gigforce.identity.enums.ProficiencyLevel;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.ContractorSkillRepository;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ContractorProfileServiceImpl implements ContractorProfileService {

    private final ContractorProfileRepository contractorProfileRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final ContractorSkillRepository contractorSkillRepository;
    private final AuditService auditService;

    public ContractorProfileServiceImpl(
            ContractorProfileRepository contractorProfileRepository,
            UserRepository userRepository,
            SkillRepository skillRepository,
            ContractorSkillRepository contractorSkillRepository,
            AuditService auditService
    ) {
        this.contractorProfileRepository = contractorProfileRepository;
        this.userRepository = userRepository;
        this.skillRepository = skillRepository;
        this.contractorSkillRepository = contractorSkillRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO createProfile(Long userId, ContractorProfileRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));

        if (contractorProfileRepository.existsByUser(user)) {
            throw new DuplicateProfileException("Contractor profile already exists for this user.");
        }

        if (user.getRole() != UserRole.CONTRACTOR && user.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Only users with CONTRACTOR or ADMIN role can have a profile.");
        }

        ContractorProfile profile = ContractorProfile.builder()
                .user(user)
                .title(request.getTitle().trim())
                .bio(request.getBio() != null ? request.getBio().trim() : null)
                .hourlyRate(request.getHourlyRate())
                .experienceYears(request.getExperienceYears())
                .status(ContractorStatus.ONBOARDING)
                .build();

        ContractorProfile savedProfile = contractorProfileRepository.save(profile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : savedProfile.getUser().getId();

        // Log audit event
        auditService.logAction(
                actorId,
                "CONTRACTOR_PROFILE_CREATED",
                "ContractorProfile",
                savedProfile.getId(),
                "Contractor profile created for user: " + savedProfile.getUser().getEmail() + " with title: " + savedProfile.getTitle()
        );

        return toDto(savedProfile, List.of());
    }

    @Override
    public ContractorProfileResponseDTO getProfileById(Long profileId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);
        return toDto(profile, skills);
    }

    @Override
    public ContractorProfileResponseDTO getProfileByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        ContractorProfile profile = contractorProfileRepository.findByUser(user)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found for user: " + user.getEmail()));
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);
        return toDto(profile, skills);
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO updateProfile(Long profileId, ContractorProfileRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        profile.setTitle(request.getTitle().trim());
        profile.setBio(request.getBio() != null ? request.getBio().trim() : null);
        profile.setHourlyRate(request.getHourlyRate());
        profile.setExperienceYears(request.getExperienceYears());

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                ContractorStatus statusEnum = ContractorStatus.valueOf(request.getStatus().toUpperCase().trim());
                profile.setStatus(statusEnum);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid status: " + request.getStatus());
            }
        }

        ContractorProfile updatedProfile = contractorProfileRepository.save(profile);
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(updatedProfile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : updatedProfile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_PROFILE_UPDATED",
                "ContractorProfile",
                updatedProfile.getId(),
                "Contractor profile updated for user: " + updatedProfile.getUser().getEmail()
        );

        return toDto(updatedProfile, skills);
    }

    @Override
    public Page<ContractorProfileResponseDTO> searchProfiles(
            int page,
            int size,
            String skillName,
            Integer minExperience,
            String status
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Specification<ContractorProfile> spec = Specification.where(null);

        if (status != null && !status.trim().isEmpty()) {
            try {
                ContractorStatus statusEnum = ContractorStatus.valueOf(status.toUpperCase().trim());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), statusEnum));
            } catch (IllegalArgumentException e) {
                // ignore invalid status filter
            }
        }

        if (minExperience != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("experienceYears"), minExperience));
        }

        if (skillName != null && !skillName.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Subquery<Long> subquery = query.subquery(Long.class);
                jakarta.persistence.criteria.Root<ContractorSkill> csRoot = subquery.from(ContractorSkill.class);
                subquery.select(csRoot.get("contractorProfile").get("id"))
                        .where(cb.like(cb.lower(csRoot.get("skill").get("name")), "%" + skillName.trim().toLowerCase() + "%"));
                return cb.in(root.get("id")).value(subquery);
            });
        }

        return contractorProfileRepository.findAll(spec, pageable).map(p -> {
            List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(p);
            return toDto(p, skills);
        });
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO addSkill(Long profileId, ContractorSkillRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        Skill skill = skillRepository.findById(request.getSkillId())
                .orElseThrow(() -> new SkillNotFoundException("Skill not found with ID: " + request.getSkillId()));

        if (contractorSkillRepository.existsByContractorProfileAndSkill(profile, skill)) {
            throw new DuplicateSkillException("Skill '" + skill.getName() + "' is already mapped to this profile.");
        }

        ProficiencyLevel level;
        try {
            level = ProficiencyLevel.valueOf(request.getProficiencyLevel().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid proficiency level: " + request.getProficiencyLevel());
        }

        ContractorSkill contractorSkill = ContractorSkill.builder()
                .contractorProfile(profile)
                .skill(skill)
                .proficiencyLevel(level)
                .yearsOfExperience(request.getYearsOfExperience())
                .build();

        contractorSkillRepository.save(contractorSkill);
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_SKILL_ADDED",
                "ContractorProfile",
                profile.getId(),
                "Skill " + skill.getName() + " added to profile of user: " + profile.getUser().getEmail() + " with proficiency: " + level.name()
        );

        return toDto(profile, skills);
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO updateSkill(Long profileId, Long skillId, ContractorSkillRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new SkillNotFoundException("Skill not found with ID: " + skillId));

        ContractorSkill contractorSkill = contractorSkillRepository.findByContractorProfileAndSkill(profile, skill)
                .orElseThrow(() -> new SkillNotFoundException("Skill association not found on this profile."));

        ProficiencyLevel level;
        try {
            level = ProficiencyLevel.valueOf(request.getProficiencyLevel().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid proficiency level: " + request.getProficiencyLevel());
        }

        contractorSkill.setProficiencyLevel(level);
        contractorSkill.setYearsOfExperience(request.getYearsOfExperience());
        contractorSkillRepository.save(contractorSkill);

        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_SKILL_UPDATED",
                "ContractorProfile",
                profile.getId(),
                "Skill " + skill.getName() + " updated on profile of user: " + profile.getUser().getEmail()
        );

        return toDto(profile, skills);
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO removeSkill(Long profileId, Long skillId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new SkillNotFoundException("Skill not found with ID: " + skillId));

        ContractorSkill contractorSkill = contractorSkillRepository.findByContractorProfileAndSkill(profile, skill)
                .orElseThrow(() -> new SkillNotFoundException("Skill association not found on this profile."));

        contractorSkillRepository.delete(contractorSkill);
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        Long actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_SKILL_REMOVED",
                "ContractorProfile",
                profile.getId(),
                "Skill " + skill.getName() + " removed from profile of user: " + profile.getUser().getEmail()
        );

        return toDto(profile, skills);
    }

    private ContractorProfileResponseDTO toDto(ContractorProfile profile, List<ContractorSkill> skills) {
        List<ContractorSkillResponseDTO> skillDtos = skills.stream()
                .map(cs -> ContractorSkillResponseDTO.builder()
                        .skillId(cs.getSkill().getId())
                        .skillName(cs.getSkill().getName())
                        .skillCategory(cs.getSkill().getCategory())
                        .proficiencyLevel(cs.getProficiencyLevel().name())
                        .yearsOfExperience(cs.getYearsOfExperience())
                        .build())
                .collect(Collectors.toList());

        return ContractorProfileResponseDTO.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .userName(profile.getUser().getName())
                .userEmail(profile.getUser().getEmail())
                .title(profile.getTitle())
                .bio(profile.getBio())
                .hourlyRate(profile.getHourlyRate())
                .experienceYears(profile.getExperienceYears())
                .status(profile.getStatus().name())
                .skills(skillDtos)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}

package com.gigforce.identity.service;

import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.ContractorProfileNotFoundException;
import com.gigforce.exception.DuplicateProfileException;
import com.gigforce.exception.DuplicateSkillException;
import com.gigforce.exception.SkillNotFoundException;
import com.gigforce.exception.UserNotFoundException;
import com.gigforce.identity.dto.*;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.ContractorSkill;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.ProficiencyLevel;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.ContractorSkillRepository;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import jakarta.validation.Valid;
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
            AuditService auditService) {
        this.contractorProfileRepository = contractorProfileRepository;
        this.userRepository = userRepository;
        this.skillRepository = skillRepository;
        this.contractorSkillRepository = contractorSkillRepository;
        this.auditService = auditService;
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO createProfile(String userId, @Valid ContractorProfileCreationRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));

        if (contractorProfileRepository.existsByUser(user)) {
            throw new DuplicateProfileException("Contractor profile already exists for this user.");
        }

        if (user.getRole() != UserRole.CONTRACTOR) {
            throw new IllegalArgumentException("Only users with CONTRACTOR role can have a profile.");
        }

        AvailabilityStatus availability = AvailabilityStatus.AVAILABLE;


        ProfileStatus profileStatus = ProfileStatus.ACTIVE;


        EngagementType preferredEngagementType;
        if (request.getPreferredEngagementType() == null || request.getPreferredEngagementType().trim().isEmpty()) {
            throw new IllegalArgumentException("Preferred engagement type is required.");
        }
        try {
            preferredEngagementType = EngagementType.valueOf(request.getPreferredEngagementType().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid preferredEngagementType: " + request.getPreferredEngagementType());
        }

        ContractorProfile profile = ContractorProfile.builder()
            .user(user)
            .hourlyRate(request.getHourlyRate())
            .experienceYears(request.getExperienceYears())
            .availabilityStatus(availability)
            .profileStatus(profileStatus)
            .preferredEngagementType(preferredEngagementType)
            .build();

        ContractorProfile savedProfile = contractorProfileRepository.save(profile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : savedProfile.getUser().getId();

        // Log audit event (title removed from profile)
        auditService.logAction(
                actorId,
                "CONTRACTOR_PROFILE_CREATED",
                "ContractorProfile",
                savedProfile.getId(),
            "Contractor profile created for user: " + savedProfile.getUser().getEmail());

        return toDto(savedProfile, List.of());
    }

    @Override
    public ContractorProfileResponseDTO getProfileById(String profileId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + profileId));
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);
        return toDto(profile, skills);
    }

    @Override
    public ContractorProfileResponseDTO getProfileByUserId(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        ContractorProfile profile = contractorProfileRepository.findByUser(user)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found for user: " + user.getEmail()));
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);
        return toDto(profile, skills);
    }



    @Override
    @Transactional
    public ContractorProfileResponseDTO updateProfile(String profileId, ContractorProfileUpdateRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + profileId));

        // title & bio removed per requirements
        profile.setHourlyRate(request.getHourlyRate());
        profile.setExperienceYears(request.getExperienceYears());
        if (request.getAvailabilityStatus() != null && !request.getAvailabilityStatus().trim().isEmpty()) {
            try {
                AvailabilityStatus avail = AvailabilityStatus.valueOf(request.getAvailabilityStatus().toUpperCase().trim());
                profile.setAvailabilityStatus(avail);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid availabilityStatus: " + request.getAvailabilityStatus());
            }
        }else{
            throw new IllegalArgumentException("Invalid availabilityStatus: Can't be null or Empty");
        }

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                ProfileStatus pstatus = ProfileStatus.valueOf(request.getStatus().toUpperCase().trim());
                profile.setProfileStatus(pstatus);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid profile status: " + request.getStatus());
            }
        }
        else{
            throw new IllegalArgumentException("Invalid Profile Status: Can't be Empty");
        }

        if (request.getPreferredEngagementType() != null && !request.getPreferredEngagementType().trim().isEmpty()) {
            try {
                EngagementType engType = EngagementType.valueOf(request.getPreferredEngagementType().toUpperCase().trim());
                profile.setPreferredEngagementType(engType);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid preferredEngagementType: " + request.getPreferredEngagementType());
            }
        }
        else{
            throw new IllegalArgumentException("Invalid Preferred Engagement Type: Can't be Empty");
        }

        ContractorProfile updatedProfile = contractorProfileRepository.save(profile);
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(updatedProfile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : updatedProfile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_PROFILE_UPDATED",
                "ContractorProfile",
                updatedProfile.getId(),
                "Contractor profile updated for user: " + updatedProfile.getUser().getEmail());

        return toDto(updatedProfile, skills);
    }

    @Override
    public Page<ContractorProfileResponseDTO> searchProfiles(
            int page,
            int size,
            String skillName,
            Integer minExperience,
            String status) {
        Pageable pageable = PageRequest.of(page, size);
        Specification<ContractorProfile> spec = Specification.where(null);

        // Fetch join user to avoid N+1 queries when loading users
        spec = spec.and((root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("user", jakarta.persistence.criteria.JoinType.LEFT);
            }
            return null;
        });

        if (status != null && !status.trim().isEmpty()) {
            try {
                String statusUpper = status.toUpperCase().trim();
                if (statusUpper.equals("ACTIVE") || statusUpper.equals("INACTIVE") || statusUpper.equals("BLACKLISTED")) {
                    ProfileStatus statusEnum = ProfileStatus.valueOf(statusUpper);
                    spec = spec.and((root, query, cb) -> cb.equal(root.get("profileStatus"), statusEnum));
                } else {
                    AvailabilityStatus availEnum = null;
                    if (statusUpper.equals("ONBOARDING")) {
                        spec = spec.and((root, query, cb) -> cb.equal(root.get("profileStatus"), ProfileStatus.ACTIVE));
                    } else {
                        if (statusUpper.equals("ASSIGNED")) {
                            availEnum = AvailabilityStatus.ON_ASSIGNMENT;
                        } else {
                            availEnum = AvailabilityStatus.valueOf(statusUpper);
                        }
                        AvailabilityStatus finalAvail = availEnum;
                        spec = spec.and((root, query, cb) -> cb.equal(root.get("availabilityStatus"), finalAvail));
                    }
                }
            } catch (IllegalArgumentException e) {
                // ignore invalid status filter
            }
        }

        if (minExperience != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("experienceYears"), minExperience));
        }

        if (skillName != null && !skillName.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Subquery<String> subquery = query.subquery(String.class);
                jakarta.persistence.criteria.Root<ContractorSkill> csRoot = subquery.from(ContractorSkill.class);
                subquery.select(csRoot.get("contractorProfile").get("id"))
                        .where(cb.like(cb.lower(csRoot.get("skill").get("name")),
                                "%" + skillName.trim().toLowerCase() + "%"));
                return cb.in(root.get("id")).value(subquery);
            });
        }

        Page<ContractorProfile> profilePage = contractorProfileRepository.findAll(spec, pageable);
        List<ContractorProfile> profiles = profilePage.getContent();

        List<ContractorSkill> allSkills = profiles.isEmpty()
                ? java.util.Collections.emptyList()
                : contractorSkillRepository.findByContractorProfileIn(profiles);

        java.util.Map<String, List<ContractorSkill>> skillsByProfileId = allSkills.stream()
                .collect(Collectors.groupingBy(cs -> cs.getContractorProfile().getId()));

        return profilePage.map(p -> {
            List<ContractorSkill> skills = skillsByProfileId.getOrDefault(p.getId(), java.util.Collections.emptyList());
            return toDto(p, skills);
        });
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO addSkill(String profileId, ContractorSkillRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + profileId));

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
        String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_SKILL_ADDED",
                "ContractorProfile",
                profile.getId(),
                "Skill " + skill.getName() + " added to profile of user: " + profile.getUser().getEmail()
                        + " with proficiency: " + level.name());

        return toDto(profile, skills);
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO updateSkill(String profileId, String skillId, ContractorSkillUpdateRequestDTO request) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + profileId));

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
        String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_SKILL_UPDATED",
                "ContractorProfile",
                profile.getId(),
                "Skill " + skill.getName() + " updated on profile of user: " + profile.getUser().getEmail());

        return toDto(profile, skills);
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO removeSkill(String profileId, String skillId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + profileId));

        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new SkillNotFoundException("Skill not found with ID: " + skillId));

        ContractorSkill contractorSkill = contractorSkillRepository.findByContractorProfileAndSkill(profile, skill)
                .orElseThrow(() -> new SkillNotFoundException("Skill association not found on this profile."));

        contractorSkillRepository.delete(contractorSkill);
        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(profile);

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        // Log audit
        auditService.logAction(
                actorId,
                "CONTRACTOR_SKILL_REMOVED",
                "ContractorProfile",
                profile.getId(),
                "Skill " + skill.getName() + " removed from profile of user: " + profile.getUser().getEmail());

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
                .availabilityStatus(profile.getAvailabilityStatus() != null ? profile.getAvailabilityStatus().name() : null)
//                .status(profile.getProfileStatus() == ProfileStatus.INACTIVE ? "INACTIVE" :
//                        (profile.getProfileStatus() == ProfileStatus.BLACKLISTED ? "BLACKLISTED" :
//                         (profile.getAvailabilityStatus() == AvailabilityStatus.ON_ASSIGNMENT ? "ACTIVE" :
//                          (profile.getAvailabilityStatus() == AvailabilityStatus.ON_STATUS ? "ONBOARDING" : "AVAILABLE"))))
//
                .status(profile.getProfileStatus() != null ? profile.getProfileStatus().name() : null)
                .hourlyRate(profile.getHourlyRate())
                .experienceYears(profile.getExperienceYears())
                .skills(skillDtos)
                .preferredEngagementType(profile.getPreferredEngagementType() != null ? profile.getPreferredEngagementType().name() : null)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}

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
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.ProficiencyLevel;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.ContractorSkillRepository;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.exception.BusinessValidationException;
import com.gigforce.exception.InvalidAvailabilityTransitionException;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import com.gigforce.notification.publisher.NotificationPublisher;

@Service
@Transactional(readOnly = true)
public class ContractorProfileServiceImpl implements ContractorProfileService {

    private final ContractorProfileRepository contractorProfileRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final ContractorSkillRepository contractorSkillRepository;
    private final AuditService auditService;
    private final ContractorCertificationRepository contractorCertificationRepository;
    private final NotificationPublisher notificationPublisher;

    public ContractorProfileServiceImpl(
            ContractorProfileRepository contractorProfileRepository,
            UserRepository userRepository,
            SkillRepository skillRepository,
            ContractorSkillRepository contractorSkillRepository,
            AuditService auditService,
            ContractorCertificationRepository contractorCertificationRepository,
            NotificationPublisher notificationPublisher) {
        this.contractorProfileRepository = contractorProfileRepository;
        this.userRepository = userRepository;
        this.skillRepository = skillRepository;
        this.contractorSkillRepository = contractorSkillRepository;
        this.auditService = auditService;
        this.contractorCertificationRepository = contractorCertificationRepository;
        this.notificationPublisher = notificationPublisher;
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO createProfile(String userId, @Valid ContractorProfileCreationRequestDTO request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));

        org.springframework.security.core.Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() != null && !"anonymousUser".equals(authentication.getPrincipal())) {
            String currentUsername = authentication.getName();
            if (!user.getEmail().equalsIgnoreCase(currentUsername)) {
                throw new BusinessValidationException("You can only create a profile for your own user account.");
            }
        }

        if (contractorProfileRepository.existsByUser(user)) {
            throw new DuplicateProfileException("Contractor profile already exists for this user.");
        }

        if (user.getRole() != UserRole.CONTRACTOR) {
            throw new BusinessValidationException("Only users with CONTRACTOR role can have a profile.");
        }

        AvailabilityStatus availability = AvailabilityStatus.AVAILABLE;
        ProfileStatus profileStatus = ProfileStatus.ACTIVE;

        EngagementType preferredEngagement = EngagementType.HYBRID;
        if (request.getPreferredEngagementType() != null && !request.getPreferredEngagementType().trim().isEmpty()) {
            try {
                preferredEngagement = EngagementType.valueOf(request.getPreferredEngagementType().toUpperCase().trim());
            } catch (IllegalArgumentException e) {
                throw new BusinessValidationException("Invalid preferredEngagementType: " + request.getPreferredEngagementType());
            }
        }

        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            user.setPhone(request.getPhone().trim());
            userRepository.save(user);
        }

        ContractorProfile profile = ContractorProfile.builder()
            .user(user)
            .displayName(request.getDisplayName() != null ? request.getDisplayName().trim() : null)
            .hourlyRate(BigDecimal.valueOf(0))
            .experienceYears(0)
            .availabilityStatus(availability)
            .profileStatus(profileStatus)
            .preferredEngagementType(preferredEngagement)
            .address("INDIA")
            .build();

        ContractorProfile savedProfile = contractorProfileRepository.save(profile);

        // Update completion
        updateProfileCompletion(savedProfile.getId());
        savedProfile = contractorProfileRepository.findById(savedProfile.getId()).get();

        // Fetch actor
        String actorEmail = (authentication != null && authentication.getPrincipal() != null && !"anonymousUser".equals(authentication.getPrincipal())) 
                ? authentication.getName() 
                : null;
        User actor = actorEmail != null ? userRepository.findByEmail(actorEmail).orElse(null) : null;
        String actorId = (actor != null) ? actor.getId() : savedProfile.getUser().getId();

        // Log audit event
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

        ProfileStatus previousStatus = profile.getProfileStatus();
        AvailabilityStatus previousAvail = profile.getAvailabilityStatus();

        if (request.getPhone() != null) {
            profile.getUser().setPhone(request.getPhone().trim());
            userRepository.save(profile.getUser());
        }
        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress().trim());
        }
        if (request.getDisplayName() != null && !request.getDisplayName().trim().isEmpty()) {
            profile.setDisplayName(request.getDisplayName().trim());
        }

        profile.setHourlyRate(request.getHourlyRate());
        profile.setExperienceYears(request.getExperienceYears());
        if (request.getAvailableFromDate() != null) {
            profile.setAvailableFromDate(request.getAvailableFromDate());
        }

        // Fetch actor
        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();

        if (request.getAvailabilityStatus() != null && !request.getAvailabilityStatus().trim().isEmpty()) {
            if (actor != null && "CONTRACTOR".equals(actor.getRole().name())) {
                // Ignore availabilityStatus updates from contractors
            } else {
                try {
                    AvailabilityStatus target = AvailabilityStatus.valueOf(request.getAvailabilityStatus().toUpperCase().trim());
                    validateAvailabilityTransition(previousAvail, target);
                    profile.setAvailabilityStatus(target);
                } catch (IllegalArgumentException e) {
                    throw new BusinessValidationException("Invalid availabilityStatus: " + request.getAvailabilityStatus());
                }
            }
        }

        // Profile status (Active/Inactive/Blacklisted) is not changed here — it is an
        // account-control action handled by HR/Vendor/Admin via updateProfileStatus().

        if (request.getPreferredEngagementType() != null && !request.getPreferredEngagementType().trim().isEmpty()) {
            try {
                EngagementType engType = EngagementType.valueOf(request.getPreferredEngagementType().toUpperCase().trim());
                profile.setPreferredEngagementType(engType);
            } catch (IllegalArgumentException e) {
                throw new BusinessValidationException("Invalid preferredEngagementType: " + request.getPreferredEngagementType());
            }
        } else {
            throw new BusinessValidationException("Invalid Preferred Engagement Type: Can't be Empty");
        }

        ContractorProfile updatedProfile = contractorProfileRepository.save(profile);
        
        // Update completeness
        updateProfileCompletion(updatedProfile.getId());
        updatedProfile = contractorProfileRepository.findById(updatedProfile.getId()).get();

        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(updatedProfile);



        // Audit Logging
        auditService.logAction(
                actorId,
                "CONTRACTOR_PROFILE_UPDATED",
                "ContractorProfile",
                updatedProfile.getId(),
                "Contractor profile updated for user: " + updatedProfile.getUser().getEmail());

        if (request.getAvailabilityStatus() != null && previousAvail != updatedProfile.getAvailabilityStatus()) {
            auditService.logAction(
                    actorId,
                    "CONTRACTOR_AVAILABILITY_CHANGED",
                    "ContractorProfile",
                    updatedProfile.getId(),
                    "Availability changed from " + previousAvail + " to " + updatedProfile.getAvailabilityStatus() + " for user: " + updatedProfile.getUser().getEmail());
        }

        return toDto(updatedProfile, skills);
    }

    @Override
    @Transactional
    public ContractorProfileResponseDTO updateProfileStatus(String profileId, String status) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException(
                        "Contractor profile not found with ID: " + profileId));

        if (status == null || status.trim().isEmpty()) {
            throw new BusinessValidationException("Profile status is required.");
        }

        ProfileStatus previousStatus = profile.getProfileStatus();
        ProfileStatus target;
        try {
            target = ProfileStatus.valueOf(status.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessValidationException("Invalid profile status: " + status);
        }

        validateProfileStatusTransition(previousStatus, target);
        profile.setProfileStatus(target);
        ContractorProfile updatedProfile = contractorProfileRepository.save(profile);

        String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        User actor = userRepository.findByEmail(actorEmail).orElse(null);
        String actorId = (actor != null) ? actor.getId() : updatedProfile.getUser().getId();

        String auditAction = "CONTRACTOR_PROFILE_UPDATED";
        if (target == ProfileStatus.INACTIVE || target == ProfileStatus.BLACKLISTED) {
            auditAction = "CONTRACTOR_PROFILE_SUSPENDED";
        } else if (previousStatus == ProfileStatus.INACTIVE || previousStatus == ProfileStatus.BLACKLISTED) {
            auditAction = "CONTRACTOR_PROFILE_ACTIVATED";
        }

        auditService.logAction(
                actorId,
                auditAction,
                "ContractorProfile",
                updatedProfile.getId(),
                "Contractor profile status changed from " + previousStatus + " to " + target
                        + " for user: " + updatedProfile.getUser().getEmail());

        List<ContractorSkill> skills = contractorSkillRepository.findByContractorProfile(updatedProfile);
        return toDto(updatedProfile, skills);
    }

    @Override
    public Page<ContractorProfileResponseDTO> searchProfiles(
            int page,
            int size,
            String skillName,
            Integer minExperience,
            String status,
            String availability,
            String location,
            String certification,
            String name,
            String email,
            String phone,
            String orgUnitId,
            String preferredEngagementType,
            BigDecimal minHourlyRate,
            java.time.LocalDate availableFromDate) {
        Pageable pageable = PageRequest.of(page, size);
        Specification<ContractorProfile> spec = Specification.where(null);

        // Fetch join user to avoid N+1 queries when loading users
        spec = spec.and((root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("user", jakarta.persistence.criteria.JoinType.LEFT);
            }
            return null;
        });

        // 1. Organization Unit Scope Check
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUsername).orElse(null);
        if (currentUser != null) {
            String role = currentUser.getRole().name();
            if (role.equals("HIRING_MANAGER")) {
                String userOrg = currentUser.getOrgUnitId();
                spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("orgUnitId"), userOrg));
            }
            // Vendors are not org-scoped (contractors have no orgUnitId either), so they browse the
            // full contractor marketplace to source candidates for any open requisition, same as Admin/Finance.
        }

        // 2. Explicit orgUnitId search parameter (normalized to match stored values)
        if (orgUnitId != null && !orgUnitId.trim().isEmpty()) {
            String normalizedOrg = orgUnitId.trim().toUpperCase();
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("orgUnitId"), normalizedOrg));
        }

        // 3. Status filter
        if (status != null && !status.trim().isEmpty()) {
            try {
                String statusUpper = status.toUpperCase().trim();
                if (statusUpper.equals("ACTIVE") || statusUpper.equals("INACTIVE") || statusUpper.equals("BLACKLISTED")) {
                    ProfileStatus statusEnum = ProfileStatus.valueOf(statusUpper);
                    spec = spec.and((root, query, cb) -> cb.equal(root.get("profileStatus"), statusEnum));
                }
            } catch (IllegalArgumentException e) {
                // ignore
            }
        }

        // 4. Availability filter
        if (availability != null && !availability.trim().isEmpty()) {
            try {
                AvailabilityStatus availEnum = AvailabilityStatus.valueOf(availability.toUpperCase().trim());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("availabilityStatus"), availEnum));
            } catch (IllegalArgumentException e) {
                // ignore
            }
        }

        // 5. Min experience (experienceYears)
        if (minExperience != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("experienceYears"), minExperience));
        }

        // 6. Skill search specification
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

        // 7. Location (address) search
        if (location != null && !location.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("address")), "%" + location.trim().toLowerCase() + "%"));
        }

        // 8. Certification name search
        if (certification != null && !certification.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Subquery<String> subquery = query.subquery(String.class);
                jakarta.persistence.criteria.Root<ContractorCertification> certRoot = subquery.from(ContractorCertification.class);
                subquery.select(certRoot.get("contractorProfile").get("id"))
                        .where(cb.like(cb.lower(certRoot.get("name")),
                                "%" + certification.trim().toLowerCase() + "%"));
                return cb.in(root.get("id")).value(subquery);
            });
        }

        // 9. Name search
        if (name != null && !name.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("user").get("name")), "%" + name.trim().toLowerCase() + "%"));
        }

        // 10. Email search
        if (email != null && !email.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("user").get("email")), email.trim().toLowerCase()));
        }

        // 11. Phone search
        if (phone != null && !phone.trim().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("phone"), phone.trim()));
        }

        // 12. Preferred engagement type
        if (preferredEngagementType != null && !preferredEngagementType.trim().isEmpty()) {
            try {
                EngagementType engType = EngagementType.valueOf(preferredEngagementType.toUpperCase().trim());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("preferredEngagementType"), engType));
            } catch (IllegalArgumentException e) {
                // ignore
            }
        }

        // 13. Min Hourly Rate
        if (minHourlyRate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("hourlyRate"), minHourlyRate));
        }

        // 14. Available From Date (on or before selected date)
        if (availableFromDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("availableFromDate"), availableFromDate));
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

        if (request.getProficiencyLevel() == null || request.getProficiencyLevel().trim().isEmpty()) {
            throw new BusinessValidationException("Proficiency level is mandatory.");
        }

        if (request.getYearsOfExperience() == null || request.getYearsOfExperience() < 0) {
            throw new BusinessValidationException("Years of experience cannot be negative.");
        }

        if (profile.getExperienceYears() != null && request.getYearsOfExperience() > profile.getExperienceYears()) {
            throw new BusinessValidationException("Skill experience cannot exceed overall profile experience (" + profile.getExperienceYears() + " years).");
        }

        ProficiencyLevel level;
        try {
            level = ProficiencyLevel.valueOf(request.getProficiencyLevel().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessValidationException("Invalid proficiency level: " + request.getProficiencyLevel());
        }

        ContractorSkill contractorSkill = ContractorSkill.builder()
                .contractorProfile(profile)
                .skill(skill)
                .proficiencyLevel(level)
                .yearsOfExperience(request.getYearsOfExperience())
                .build();

        contractorSkillRepository.save(contractorSkill);
        
        // Update completion
        updateProfileCompletion(profile.getId());
        profile = contractorProfileRepository.findById(profile.getId()).get();

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

        notificationPublisher.publishSkillAdded(profile, skill);

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

        if (request.getProficiencyLevel() == null || request.getProficiencyLevel().trim().isEmpty()) {
            throw new BusinessValidationException("Proficiency level is mandatory.");
        }

        if (request.getYearsOfExperience() == null || request.getYearsOfExperience() < 0) {
            throw new BusinessValidationException("Years of experience cannot be negative.");
        }

        if (profile.getExperienceYears() != null && request.getYearsOfExperience() > profile.getExperienceYears()) {
            throw new BusinessValidationException("Skill experience cannot exceed overall profile experience (" + profile.getExperienceYears() + " years).");
        }

        ProficiencyLevel level;
        try {
            level = ProficiencyLevel.valueOf(request.getProficiencyLevel().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessValidationException("Invalid proficiency level: " + request.getProficiencyLevel());
        }

        contractorSkill.setProficiencyLevel(level);
        contractorSkill.setYearsOfExperience(request.getYearsOfExperience());
        contractorSkillRepository.save(contractorSkill);

        // Update completion
        updateProfileCompletion(profile.getId());
        profile = contractorProfileRepository.findById(profile.getId()).get();

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

        // Update completion
        updateProfileCompletion(profile.getId());
        profile = contractorProfileRepository.findById(profile.getId()).get();

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

        String mappedStatus = "AVAILABLE";
        if (profile.getProfileStatus() == ProfileStatus.INACTIVE) {
            mappedStatus = "INACTIVE";
        } else if (profile.getProfileStatus() == ProfileStatus.BLACKLISTED) {
            mappedStatus = "BLACKLISTED";
        } else {
            if (profile.getAvailabilityStatus() == AvailabilityStatus.ON_NOTICE) {
                mappedStatus = "ON_NOTICE";
            } else if (profile.getAvailabilityStatus() == AvailabilityStatus.ON_ASSIGNMENT) {
                mappedStatus = "ON_ASSIGNMENT";
            } else if (profile.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE) {
                mappedStatus = "AVAILABLE";
            }
        }

        int score = 0;
        if (profile.getHourlyRate() != null && profile.getPreferredEngagementType() != null && profile.getAddress() != null && !profile.getAddress().trim().isEmpty()) {
            score += 20;
        }
        boolean hasSkills = contractorSkillRepository.existsByContractorProfile(profile);
        if (hasSkills) {
            score += 20;
        }
        if (profile.getExperienceYears() != null && profile.getExperienceYears() > 0) {
            score += 20;
        }
        boolean hasCerts = contractorCertificationRepository.existsByContractorProfile(profile);
        if (hasCerts) {
            score += 20;
        }
        if (profile.getAvailabilityStatus() != null) {
            score += 20;
        }

        return ContractorProfileResponseDTO.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .displayName(profile.getDisplayName())
                .userName(profile.getUser().getName())
                .userEmail(profile.getUser().getEmail())
                .availabilityStatus(profile.getAvailabilityStatus() != null ? profile.getAvailabilityStatus().name() : null)
                .availableFromDate(profile.getAvailableFromDate())
                .status(mappedStatus)
                .hourlyRate(profile.getHourlyRate())
                .experienceYears(profile.getExperienceYears())
                .skills(skillDtos)
                .preferredEngagementType(profile.getPreferredEngagementType() != null ? profile.getPreferredEngagementType().name() : null)
                .phone(profile.getUser().getPhone())
                .address(profile.getAddress())
                .completionScore(score)
                .orgUnitId(profile.getUser().getOrgUnitId())
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public void updateProfileCompletion(String profileId) {
        ContractorProfile profile = contractorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ContractorProfileNotFoundException("Contractor profile not found with ID: " + profileId));
        
        int score = 0;
        if (profile.getHourlyRate() != null && profile.getPreferredEngagementType() != null && profile.getAddress() != null && !profile.getAddress().trim().isEmpty()) {
            score += 20;
        }
        if (contractorSkillRepository.existsByContractorProfile(profile)) {
            score += 20;
        }
        if (profile.getExperienceYears() != null && profile.getExperienceYears() > 0) {
            score += 20;
        }
        if (contractorCertificationRepository.existsByContractorProfile(profile)) {
            score += 20;
        }
        if (profile.getAvailabilityStatus() != null) {
            score += 20;
        }

        if (score == 100) {
            // Publish profile completion notification and audit (do not change profileStatus enum)
            String actorEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            User actor = userRepository.findByEmail(actorEmail).orElse(null);
            String actorId = (actor != null) ? actor.getId() : profile.getUser().getId();
            auditService.logAction(
                    actorId,
                    "CONTRACTOR_PROFILE_COMPLETED",
                    "ContractorProfile",
                    profile.getId(),
                    "Profile completeness reached 100% for user: " + profile.getUser().getEmail());

            notificationPublisher.publishProfileCompletion(profile);
        }
    }

    private void validateAvailabilityTransition(AvailabilityStatus current, AvailabilityStatus target) {
        if (current == target) {
            return;
        }
        boolean valid = false;
        switch (current) {
            case AVAILABLE:
                valid = (target == AvailabilityStatus.ON_ASSIGNMENT) || (target == AvailabilityStatus.ON_NOTICE);
                break;
            case ON_ASSIGNMENT:
                valid = (target == AvailabilityStatus.AVAILABLE) || (target == AvailabilityStatus.ON_NOTICE);
                break;
            case ON_NOTICE:
                valid = true;
                break;
            default:
                valid = false;
        }
        if (!valid) {
            throw new InvalidAvailabilityTransitionException("Invalid availability transition from " + current + " to " + target);
        }
    }

    private void validateProfileStatusTransition(ProfileStatus current, ProfileStatus target) {
        if (current == target) {
            return;
        }
        boolean valid = false;
        // Only allow transitions between ACTIVE, INACTIVE and BLACKLISTED
        switch (current) {
            case ACTIVE:
                valid = (target == ProfileStatus.INACTIVE) || (target == ProfileStatus.BLACKLISTED);
                break;
            case INACTIVE:
            case BLACKLISTED:
                valid = (target == ProfileStatus.ACTIVE);
                break;
            default:
                valid = false;
        }
        if (!valid) {
            throw new BusinessValidationException("Invalid profile status transition from " + current + " to " + target);
        }
    }
}

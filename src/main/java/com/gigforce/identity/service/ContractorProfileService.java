package com.gigforce.identity.service;

import com.gigforce.identity.dto.ContractorProfileRequestDTO;
import com.gigforce.identity.dto.ContractorProfileResponseDTO;
import com.gigforce.identity.dto.ContractorSkillRequestDTO;
import org.springframework.data.domain.Page;

public interface ContractorProfileService {
    ContractorProfileResponseDTO createProfile(Long userId, ContractorProfileRequestDTO request);
    ContractorProfileResponseDTO getProfileById(Long profileId);
    ContractorProfileResponseDTO getProfileByUserId(Long userId);
    ContractorProfileResponseDTO updateProfile(Long profileId, ContractorProfileRequestDTO request);
    Page<ContractorProfileResponseDTO> searchProfiles(int page, int size, String skillName, Integer minExperience, String status, Long orgId);
    ContractorProfileResponseDTO addSkill(Long profileId, ContractorSkillRequestDTO request);
    ContractorProfileResponseDTO updateSkill(Long profileId, Long skillId, ContractorSkillRequestDTO request);
    ContractorProfileResponseDTO removeSkill(Long profileId, Long skillId);
}

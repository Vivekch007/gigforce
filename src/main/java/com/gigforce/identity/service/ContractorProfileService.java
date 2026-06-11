package com.gigforce.identity.service;

import com.gigforce.identity.dto.ContractorProfileRequestDTO;
import com.gigforce.identity.dto.ContractorProfileResponseDTO;
import com.gigforce.identity.dto.ContractorSkillRequestDTO;
import org.springframework.data.domain.Page;

public interface ContractorProfileService {
    ContractorProfileResponseDTO createProfile(String userId, ContractorProfileRequestDTO request);
    ContractorProfileResponseDTO getProfileById(String profileId);
    ContractorProfileResponseDTO getProfileByUserId(String userId);
    ContractorProfileResponseDTO updateProfile(String profileId, ContractorProfileRequestDTO request);
    Page<ContractorProfileResponseDTO> searchProfiles(int page, int size, String skillName, Integer minExperience, String status);
    ContractorProfileResponseDTO addSkill(String profileId, ContractorSkillRequestDTO request);
    ContractorProfileResponseDTO updateSkill(String profileId, String skillId, ContractorSkillRequestDTO request);
    ContractorProfileResponseDTO removeSkill(String profileId, String skillId);
}

package com.gigforce.identity.service;

import com.gigforce.identity.dto.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;

public interface ContractorProfileService {
    ContractorProfileResponseDTO createProfile(String userId, @Valid ContractorProfileCreationRequestDTO request);
    ContractorProfileResponseDTO getProfileById(String profileId);
    ContractorProfileResponseDTO getProfileByUserId(String userId);
    ContractorProfileResponseDTO updateProfile(String profileId, ContractorProfileUpdateRequestDTO request);
    ContractorProfileResponseDTO updateProfileStatus(String profileId, String status);
    Page<ContractorProfileResponseDTO> searchProfiles(
            int page, int size, String skillName, Integer minExperience, String status,
            String availability, String location, String certification, String name,
            String email, String phone, String orgUnitId, String preferredEngagementType);
    ContractorProfileResponseDTO addSkill(String profileId, ContractorSkillRequestDTO request);
    ContractorProfileResponseDTO updateSkill(String profileId, String skillId, ContractorSkillUpdateRequestDTO request);
    ContractorProfileResponseDTO removeSkill(String profileId, String skillId);
    void updateProfileCompletion(String profileId);
}

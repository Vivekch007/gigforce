package com.gigforce.identity.service;

import com.gigforce.identity.dto.SkillRequestDTO;
import com.gigforce.identity.dto.SkillResponseDTO;

import java.util.List;

public interface SkillService {
    SkillResponseDTO createSkill(SkillRequestDTO request);
    List<SkillResponseDTO> getAllSkills(String category, String name);
}

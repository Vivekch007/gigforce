package com.gigforce.identity.controller;

import com.gigforce.identity.dto.SkillRequestDTO;
import com.gigforce.identity.dto.SkillResponseDTO;
import com.gigforce.identity.service.SkillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/skills")
@Tag(name = "Master Skills Management", description = "Endpoints for managing the standardized directory of skills")
public class SkillController {

    private final SkillService skillService;

    public SkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create master skill", description = "Registers a new skill in the master catalog. Restricted to ADMIN.")
    public ResponseEntity<SkillResponseDTO> createSkill(@Valid @RequestBody SkillRequestDTO request) {
        SkillResponseDTO skill = skillService.createSkill(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(skill);
    }

    @GetMapping
    @Operation(summary = "Get all master skills", description = "Lists master skills, with optional name and category filtering.")
    public ResponseEntity<List<SkillResponseDTO>> getAllSkills(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String name
    ) {
        List<SkillResponseDTO> skills = skillService.getAllSkills(category, name);
        return ResponseEntity.ok(skills);
    }
}

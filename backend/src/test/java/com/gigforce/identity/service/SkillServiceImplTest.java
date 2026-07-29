package com.gigforce.identity.service;

import com.gigforce.audit.service.AuditService;
import com.gigforce.exception.DuplicateSkillException;
import com.gigforce.identity.dto.SkillRequestDTO;
import com.gigforce.identity.dto.SkillResponseDTO;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 2 - Skill catalog service tests.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SkillServiceImplTest {

    @Mock private SkillRepository skillRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditService auditService;

    @InjectMocks private SkillServiceImpl service;

    @BeforeEach
    void setActor() {
        SecurityContext ctx = new SecurityContextImpl();
        ctx.setAuthentication(new UsernamePasswordAuthenticationToken("admin@gigforce.com", null));
        SecurityContextHolder.setContext(ctx);
        User actor = new User();
        actor.setId("admin-id");
        when(userRepository.findByEmail("admin@gigforce.com")).thenReturn(Optional.of(actor));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private Skill skill(String id, String name) {
        Skill s = Skill.builder().name(name).category("Tech").description("d").build();
        s.setId(id);
        return s;
    }

    @Test
    void createSkill_success() {
        when(skillRepository.existsByNameIgnoreCase("Java")).thenReturn(false);
        Skill saved = skill("s1", "Java");
        when(skillRepository.save(any(Skill.class))).thenReturn(saved);
        SkillRequestDTO req = SkillRequestDTO.builder().name("Java").category("Tech").description("d").build();

        SkillResponseDTO result = service.createSkill(req);

        assertEquals("s1", result.getId());
        assertEquals("Java", result.getName());
        verify(auditService).logAction(anyString(), eq("SKILL_CREATED"), eq("Skill"), eq("s1"), anyString());
    }

    @Test
    void createSkill_duplicate_throws() {
        when(skillRepository.existsByNameIgnoreCase("Java")).thenReturn(true);
        SkillRequestDTO req = SkillRequestDTO.builder().name("Java").category("Tech").build();
        assertThrows(DuplicateSkillException.class, () -> service.createSkill(req));
        verify(skillRepository, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getAllSkills_returnsMappedList() {
        when(skillRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(skill("s1", "Java"), skill("s2", "Python")));

        List<SkillResponseDTO> result = service.getAllSkills("Tech", "Ja");

        assertEquals(2, result.size());
        assertEquals("Java", result.get(0).getName());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getAllSkills_noFilters_returnsAll() {
        when(skillRepository.findAll(any(Specification.class))).thenReturn(List.of(skill("s1", "Java")));
        assertEquals(1, service.getAllSkills(null, null).size());
    }
}

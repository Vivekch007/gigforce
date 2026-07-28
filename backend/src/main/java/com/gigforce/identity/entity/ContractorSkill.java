package com.gigforce.identity.entity;

import com.gigforce.common.entity.BaseEntity;
import com.gigforce.identity.enums.ProficiencyLevel;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "contractor_skills", uniqueConstraints = {
        @UniqueConstraint(name = "uc_contractor_profile_skill", columnNames = { "contractor_profile_id", "skill_id" })
})
@AttributeOverride(name = "id", column = @Column(name = "contractor_skill_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContractorSkill extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contractor_profile_id", nullable = false)
    private ContractorProfile contractorProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(name = "proficiency_level", nullable = false, length = 30)
    private ProficiencyLevel proficiencyLevel;

    @Column(name = "years_of_experience", nullable = false)
    private Integer yearsOfExperience;
}

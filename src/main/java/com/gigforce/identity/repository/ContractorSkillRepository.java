package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.ContractorSkill;
import com.gigforce.identity.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContractorSkillRepository extends JpaRepository<ContractorSkill, Long> {
    Optional<ContractorSkill> findByContractorProfileAndSkill(ContractorProfile profile, Skill skill);
    boolean existsByContractorProfileAndSkill(ContractorProfile profile, Skill skill);
    java.util.List<ContractorSkill> findByContractorProfile(ContractorProfile contractorProfile);
}

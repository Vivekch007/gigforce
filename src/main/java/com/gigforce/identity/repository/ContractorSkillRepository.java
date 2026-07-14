package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.ContractorSkill;
import com.gigforce.identity.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContractorSkillRepository extends JpaRepository<ContractorSkill, String> {
    Optional<ContractorSkill> findByContractorProfileAndSkill(ContractorProfile profile, Skill skill);

    boolean existsByContractorProfileAndSkill(ContractorProfile profile, Skill skill);

    boolean existsByContractorProfile(ContractorProfile profile);

    @org.springframework.data.jpa.repository.Query("SELECT cs FROM ContractorSkill cs LEFT JOIN FETCH cs.skill WHERE cs.contractorProfile = :contractorProfile")
    java.util.List<ContractorSkill> findByContractorProfile(
            @org.springframework.data.repository.query.Param("contractorProfile") ContractorProfile contractorProfile);

    @org.springframework.data.jpa.repository.Query("SELECT cs FROM ContractorSkill cs LEFT JOIN FETCH cs.skill WHERE cs.contractorProfile IN :contractorProfiles")
    java.util.List<ContractorSkill> findByContractorProfileIn(
            @org.springframework.data.repository.query.Param("contractorProfiles") java.util.Collection<ContractorProfile> contractorProfiles);
}

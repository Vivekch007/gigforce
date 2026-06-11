package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.entity.ContractorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractorCertificationRepository extends JpaRepository<ContractorCertification, String> {
    List<ContractorCertification> findByContractorProfile(ContractorProfile profile);
}

package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.enums.CertificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ContractorCertificationRepository extends JpaRepository<ContractorCertification, String> {
    List<ContractorCertification> findByContractorProfile(ContractorProfile profile);

    boolean existsByContractorProfile(ContractorProfile profile);

    boolean existsByContractorProfileAndName(ContractorProfile profile, String name);

    // Used by the scheduled auto-expiry job to find certs whose expiry has passed.
    List<ContractorCertification> findByCertStatusAndExpiryDateBefore(CertificationStatus certStatus, LocalDate date);
}

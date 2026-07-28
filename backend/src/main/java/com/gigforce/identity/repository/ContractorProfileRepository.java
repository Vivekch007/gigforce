package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContractorProfileRepository
        extends JpaRepository<ContractorProfile, String>, JpaSpecificationExecutor<ContractorProfile> {
    Optional<ContractorProfile> findByUser(User user);
    Optional<ContractorProfile> findById(String id);

    boolean existsByUser(User user);
    Optional<ContractorProfile> findByUserId(String userId);
}

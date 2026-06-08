package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.EngagementHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EngagementHistoryRepository extends JpaRepository<EngagementHistory, Long> {
    List<EngagementHistory> findByContractorProfile(ContractorProfile profile);
}

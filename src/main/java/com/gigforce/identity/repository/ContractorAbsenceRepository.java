package com.gigforce.identity.repository;

import com.gigforce.identity.entity.ContractorAbsence;
import com.gigforce.assignment.enums.AbsenceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface ContractorAbsenceRepository extends JpaRepository<ContractorAbsence, String>, JpaSpecificationExecutor<ContractorAbsence> {

        @Query("SELECT a FROM ContractorAbsence a WHERE a.contractorProfile.id = :profileId AND a.status = :status AND a.startDate <= :endDate AND a.endDate >= :startDate")
        List<ContractorAbsence> findApprovedAbsencesInRange(
                        @Param("profileId") String profileId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate,
                        @Param("status") AbsenceStatus status);

        @Query("SELECT a FROM ContractorAbsence a WHERE a.contractorProfile.id = :profileId AND a.status IN :statuses AND a.startDate <= :endDate AND a.endDate >= :startDate")
        List<ContractorAbsence> findOverlappingAbsences(
                        @Param("profileId") String profileId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate,
                        @Param("statuses") Collection<AbsenceStatus> statuses);

        List<ContractorAbsence> findByContractorProfileId(String contractorProfileId);
}

package com.gigforce.assignment.repository;

import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.identity.entity.ContractorProfile;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, String> {


    List<Assignment> findByContractorProfileId(String contractorProfileId);

        @Query(value = "SELECT a FROM Assignment a " +
                        "LEFT JOIN FETCH a.requisition r " +
                        "LEFT JOIN FETCH a.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH a.hiringManager hm " +
                        "LEFT JOIN FETCH a.vendor v " +
                        "WHERE (:status IS NULL OR a.status = :status) AND " +
                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)", countQuery = "SELECT COUNT(a) FROM Assignment a WHERE "
                                        +
                                        "(:status IS NULL OR a.status = :status) AND " +
                                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)")
        Page<Assignment> searchAssignments(
                        @Param("status") AssignmentStatus status,
                        @Param("contractorProfileId") String contractorProfileId,
                        Pageable pageable);

        @Query(value = "SELECT a FROM Assignment a " +
                        "LEFT JOIN FETCH a.requisition r " +
                        "LEFT JOIN FETCH a.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH a.hiringManager hm " +
                        "LEFT JOIN FETCH a.vendor v " +
                        "WHERE a.hiringManager.id = :hiringManagerId AND " +
                        "(:status IS NULL OR a.status = :status) AND " +
                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)", countQuery = "SELECT COUNT(a) FROM Assignment a WHERE "
                                        +
                                        "a.hiringManager.id = :hiringManagerId AND " +
                                        "(:status IS NULL OR a.status = :status) AND " +
                                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)")
        Page<Assignment> searchAssignmentsByHiringManager(
                        @Param("hiringManagerId") String hiringManagerId,
                        @Param("status") AssignmentStatus status,
                        @Param("contractorProfileId") String contractorProfileId,
                        Pageable pageable);

        @Query(value = "SELECT a FROM Assignment a " +
                        "LEFT JOIN FETCH a.requisition r " +
                        "LEFT JOIN FETCH a.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH a.hiringManager hm " +
                        "LEFT JOIN FETCH a.vendor v " +
                        "WHERE a.vendor.id = :vendorId AND " +
                        "(:status IS NULL OR a.status = :status) AND " +
                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)", countQuery = "SELECT COUNT(a) FROM Assignment a WHERE "
                                        +
                                        "a.vendor.id = :vendorId AND " +
                                        "(:status IS NULL OR a.status = :status) AND " +
                                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)")
        Page<Assignment> searchAssignmentsByVendor(
                        @Param("vendorId") String vendorId,
                        @Param("status") AssignmentStatus status,
                        @Param("contractorProfileId") String contractorProfileId,
                        Pageable pageable);

        @Query(value = "SELECT a FROM Assignment a " +
                        "LEFT JOIN FETCH a.requisition r " +
                        "LEFT JOIN FETCH a.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH a.hiringManager hm " +
                        "LEFT JOIN FETCH a.vendor v " +
                        "WHERE a.contractorProfile.user.id = :contractorUserId AND " +
                        "(:status IS NULL OR a.status = :status) AND " +
                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)", countQuery = "SELECT COUNT(a) FROM Assignment a WHERE "
                                        +
                                        "a.contractorProfile.user.id = :contractorUserId AND " +
                                        "(:status IS NULL OR a.status = :status) AND " +
                                        "(:contractorProfileId IS NULL OR a.contractorProfile.id = :contractorProfileId)")
        Page<Assignment> searchAssignmentsByContractorUser(
                        @Param("contractorUserId") String contractorUserId,
                        @Param("status") AssignmentStatus status,
                        @Param("contractorProfileId") String contractorProfileId,
                        Pageable pageable);

        long countByRequisitionIdAndStatus(String requisitionId, AssignmentStatus status);

        boolean existsByVendorSubmissionId(@NotNull String vendorSubmissionId);

        @Query("SELECT a FROM Assignment a WHERE a.endDate < :now AND a.status IN :statuses")
        java.util.List<Assignment> findExpiredAssignments(
                        @Param("now") java.time.LocalDate now,
                        @Param("statuses") java.util.Collection<AssignmentStatus> statuses);
}

package com.gigforce.requisition.repository;

import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.enums.SubmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorSubmissionRepository extends JpaRepository<VendorSubmission, String> {

        boolean existsByRequisitionIdAndContractorProfileId(String requisitionId, String contractorProfileId);

        List<VendorSubmission> findByRequisitionId(String requisitionId);

        long countByRequisitionIdAndStatus(String requisitionId, SubmissionStatus status);

        @Query(value = "SELECT s FROM VendorSubmission s " +
                        "LEFT JOIN FETCH s.requisition r " +
                        "LEFT JOIN FETCH s.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH s.submittedBy sb " +
                        "WHERE (:requisitionId IS NULL OR s.requisition.id = :requisitionId) AND " +
                        "(:status IS NULL OR s.status = :status) AND " +
                        "(:contractorProfileId IS NULL OR s.contractorProfile.id = :contractorProfileId)", countQuery = "SELECT COUNT(s) FROM VendorSubmission s WHERE "
                                        +
                                        "(:requisitionId IS NULL OR s.requisition.id = :requisitionId) AND " +
                                        "(:status IS NULL OR s.status = :status) AND " +
                                        "(:contractorProfileId IS NULL OR s.contractorProfile.id = :contractorProfileId)")
        Page<VendorSubmission> searchSubmissions(
                        @Param("requisitionId") String requisitionId,
                        @Param("status") SubmissionStatus status,
                        @Param("contractorProfileId") String contractorProfileId,
                        Pageable pageable);

        @Query(value = "SELECT s FROM VendorSubmission s " +
                        "LEFT JOIN FETCH s.requisition r " +
                        "LEFT JOIN FETCH s.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH s.submittedBy sb " +
                        "WHERE s.submittedBy.id = :userId AND " +
                        "(:requisitionId IS NULL OR s.requisition.id = :requisitionId) AND " +
                        "(:status IS NULL OR s.status = :status) AND " +
                        "(:contractorProfileId IS NULL OR s.contractorProfile.id = :contractorProfileId)", countQuery = "SELECT COUNT(s) FROM VendorSubmission s WHERE "
                                        +
                                        "s.submittedBy.id = :userId AND " +
                                        "(:requisitionId IS NULL OR s.requisition.id = :requisitionId) AND " +
                                        "(:status IS NULL OR s.status = :status) AND " +
                                        "(:contractorProfileId IS NULL OR s.contractorProfile.id = :contractorProfileId)")
        Page<VendorSubmission> searchSubmissionsBySubmittedBy(
                        @Param("userId") String userId,
                        @Param("requisitionId") String requisitionId,
                        @Param("status") SubmissionStatus status,
                        @Param("contractorProfileId") String contractorProfileId,
                        Pageable pageable);

        @Query(value = "SELECT s FROM VendorSubmission s " +
                        "LEFT JOIN FETCH s.requisition r " +
                        "LEFT JOIN FETCH s.contractorProfile cp " +
                        "LEFT JOIN FETCH cp.user cpu " +
                        "LEFT JOIN FETCH s.submittedBy sb " +
                        "WHERE s.contractorProfile.user.id = :userId AND " +
                        "(:requisitionId IS NULL OR s.requisition.id = :requisitionId) AND " +
                        "(:status IS NULL OR s.status = :status)", countQuery = "SELECT COUNT(s) FROM VendorSubmission s WHERE "
                                        +
                                        "s.contractorProfile.user.id = :userId AND " +
                                        "(:requisitionId IS NULL OR s.requisition.id = :requisitionId) AND " +
                                        "(:status IS NULL OR s.status = :status)")
        Page<VendorSubmission> searchSubmissionsByContractorUser(
                        @Param("userId") String userId,
                        @Param("requisitionId") String requisitionId,
                        @Param("status") SubmissionStatus status,
                        Pageable pageable);
}

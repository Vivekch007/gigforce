package com.gigforce.interview.repository;

import com.gigforce.interview.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, String> {

    @Query("SELECT i FROM Interview i " +
           "LEFT JOIN FETCH i.vendorSubmission vs " +
           "LEFT JOIN FETCH i.scheduledBy sb " +
           "ORDER BY i.date ASC, i.createdAt DESC")
    List<Interview> findAllWithDetails();

    @Query("SELECT i FROM Interview i " +
           "LEFT JOIN FETCH i.vendorSubmission vs " +
           "LEFT JOIN FETCH i.scheduledBy sb " +
           "WHERE vs.submittedBy.orgUnitId = :vendorOrgId " +
           "ORDER BY i.date ASC")
    List<Interview> findByVendorOrg(@Param("vendorOrgId") String vendorOrgId);

    @Query("SELECT i FROM Interview i " +
           "LEFT JOIN FETCH i.vendorSubmission vs " +
           "LEFT JOIN FETCH i.scheduledBy sb " +
           "WHERE vs.requisition.orgUnitId = :orgUnitId " +
           "ORDER BY i.date ASC")
    List<Interview> findByRequisitionOrgUnit(@Param("orgUnitId") String orgUnitId);
}

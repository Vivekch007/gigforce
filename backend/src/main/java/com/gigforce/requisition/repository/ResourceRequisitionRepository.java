package com.gigforce.requisition.repository;

import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.enums.RequisitionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface ResourceRequisitionRepository extends JpaRepository<ResourceRequisition, String>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<ResourceRequisition> {

        @Query(value = "SELECT r FROM ResourceRequisition r " +
                        "LEFT JOIN FETCH r.requiredSkill s " +
                        "LEFT JOIN FETCH r.creator c " +
                        "WHERE (:status IS NULL OR r.status = :status) AND " +
                        "(:requiredSkillId IS NULL OR r.requiredSkill.id = :requiredSkillId) AND " +
                        "(:maxHourlyRate IS NULL OR r.maxHourlyRate <= :maxHourlyRate) AND " +
                        "(:businessUnitId IS NULL OR r.businessUnitId = :businessUnitId)", 
                countQuery = "SELECT COUNT(r) FROM ResourceRequisition r WHERE " +
                                "(:status IS NULL OR r.status = :status) AND " +
                                "(:requiredSkillId IS NULL OR r.requiredSkill.id = :requiredSkillId) AND " +
                                "(:maxHourlyRate IS NULL OR r.maxHourlyRate <= :maxHourlyRate) AND " +
                                "(:businessUnitId IS NULL OR r.businessUnitId = :businessUnitId)")
        Page<ResourceRequisition> searchRequisitions(
                        @Param("status") RequisitionStatus status,
                        @Param("requiredSkillId") String requiredSkillId,
                        @Param("maxHourlyRate") BigDecimal maxHourlyRate,
                        @Param("businessUnitId") String businessUnitId,
                        Pageable pageable);
}

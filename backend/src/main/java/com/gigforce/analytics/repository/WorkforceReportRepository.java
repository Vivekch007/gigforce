package com.gigforce.analytics.repository;

import com.gigforce.analytics.entity.WorkforceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkforceReportRepository extends JpaRepository<WorkforceReport, String> {
    List<WorkforceReport> findByScope(String scope);
}

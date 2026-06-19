package com.gigforce.analytics.service;

import com.gigforce.analytics.dto.*;

import java.util.List;

public interface AnalyticsService {

    WorkforceReportResponseDTO generateReport(WorkforceReportRequestDTO request);

    List<WorkforceReportResponseDTO> getAllReports();

    WorkforceReportResponseDTO getReportById(String id);

    ExecutiveDashboardResponseDTO getExecutiveDashboard(Integer expiryDays);

    VendorScorecardResponseDTO getVendorScorecard(String vendorId);

    BusinessUnitDashboardResponseDTO getBusinessUnitDashboard(String businessUnit);

    SkillDashboardResponseDTO getSkillDashboard(String skill);

    Long getComplianceExpiryCount(Integer days);
}

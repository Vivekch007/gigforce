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

    PersonalDashboardResponseDTO getPersonalDashboard();

    List<ContractorEarningsResponseDTO> getContractorEarnings();

    ExecutiveDashboardResponseDTO getFilteredReport(
            java.time.LocalDate startDate,
            java.time.LocalDate endDate,
            String orgUnitId,
            String vendorId,
            String contractorId,
            String skill,
            String assignmentStatus,
            String invoiceStatus,
            String timesheetStatus);

    List<SkillDistributionResponseDTO> getSkillDistribution();

    List<ContractorReportRowDTO> getContractorReport();

    List<RequisitionReportRowDTO> getRequisitionReport();

    List<AssignmentReportRowDTO> getAssignmentReport();

    List<TimesheetReportRowDTO> getTimesheetReport();

    List<InvoiceReportRowDTO> getInvoiceReport();

    List<PaymentReportRowDTO> getPaymentReport();

    List<ComplianceReportRowDTO> getComplianceReport();
}

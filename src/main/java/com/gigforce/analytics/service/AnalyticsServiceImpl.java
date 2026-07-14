package com.gigforce.analytics.service;

import com.gigforce.analytics.dto.*;
import com.gigforce.analytics.entity.WorkforceReport;
import com.gigforce.analytics.repository.WorkforceReportRepository;
import com.gigforce.security.CurrentUserContext;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.invoice.enums.InvoiceStatus;
import com.gigforce.invoice.enums.PaymentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    @PersistenceContext
    private EntityManager entityManager;

    private final WorkforceReportRepository reportRepository;
    private final CurrentUserContext currentUserContext;

    public AnalyticsServiceImpl(WorkforceReportRepository reportRepository, CurrentUserContext currentUserContext) {
        this.reportRepository = reportRepository;
        this.currentUserContext = currentUserContext;
    }

    @Override
    @Transactional
    public WorkforceReportResponseDTO generateReport(WorkforceReportRequestDTO request) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to generate report snapshots.");
        }

        // Compute live metrics dynamically at this timestamp
        Integer activeContractors = getActiveContractorsCount();
        BigDecimal totalSpend = getTotalSpendValue();
        BigDecimal fillRate = getFillRateValue();
        BigDecimal avgTimeToFill = getAvgTimeToFillValue();
        BigDecimal timesheetApprovalRate = getTimesheetApprovalRateValue();
        Integer complianceExpiryCount = getComplianceExpiryCount(30).intValue();

        WorkforceReport report = WorkforceReport.builder()
                .scope(request.getScope())
                .activeContractors(activeContractors)
                .totalSpend(totalSpend)
                .fillRate(fillRate)
                .avgTimeToFill(avgTimeToFill)
                .timesheetApprovalRate(timesheetApprovalRate)
                .complianceExpiryCount(complianceExpiryCount)
                .generatedDate(LocalDateTime.now())
                .build();

        report = reportRepository.save(report);
        return mapToDto(report);
    }

    @Override
    public List<WorkforceReportResponseDTO> getAllReports() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view reports.");
        }

        return reportRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public WorkforceReportResponseDTO getReportById(String id) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated user.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view this report.");
        }

        WorkforceReport report = reportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found with ID: " + id));

        return mapToDto(report);
    }

    @Override
    public ExecutiveDashboardResponseDTO getExecutiveDashboard(Integer expiryDays) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin and Finance roles can view the Executive Dashboard.");
        }

        int thresholdDays = (expiryDays != null) ? expiryDays : 30;

        Long activeContractors = Long.valueOf(getActiveContractorsCount());
        Long openRequisitions = entityManager.createQuery(
                "SELECT COUNT(r.id) FROM ResourceRequisition r WHERE r.status = :status", Long.class)
                .setParameter("status", RequisitionStatus.OPEN)
                .getSingleResult();

        Long filledRequisitions = entityManager.createQuery(
                "SELECT COUNT(r.id) FROM ResourceRequisition r WHERE r.status = :status", Long.class)
                .setParameter("status", RequisitionStatus.FILLED)
                .getSingleResult();

        Long activeAssignments = entityManager.createQuery(
                "SELECT COUNT(a.id) FROM Assignment a WHERE a.status = :status", Long.class)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult();

        Long approvedTimesheets = entityManager.createQuery(
                "SELECT COUNT(t.id) FROM Timesheet t WHERE t.status = :status", Long.class)
                .setParameter("status", TimesheetStatus.APPROVED)
                .getSingleResult();

        BigDecimal approvedInvoiceAmount = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci WHERE ci.status = :status", BigDecimal.class)
                .setParameter("status", InvoiceStatus.APPROVED)
                .getSingleResult();

        BigDecimal paidAmount = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci WHERE ci.status = :status", BigDecimal.class)
                .setParameter("status", InvoiceStatus.PAID)
                .getSingleResult();

        Long complianceExpiries = getComplianceExpiryCount(thresholdDays);

        return ExecutiveDashboardResponseDTO.builder()
                .activeContractors(activeContractors)
                .openRequisitions(openRequisitions)
                .filledRequisitions(filledRequisitions)
                .activeAssignments(activeAssignments)
                .approvedTimesheets(approvedTimesheets)
                .approvedInvoiceAmount(approvedInvoiceAmount)
                .paidAmount(paidAmount)
                .complianceExpiries(complianceExpiries)
                .build();
    }

    @Override
    public VendorScorecardResponseDTO getVendorScorecard(String vendorId) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"VENDOR_MANAGER".equals(role) && !"VENDOR".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin, Vendor Manager, and Vendor roles can view Vendor Scorecard.");
        }

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            vendorId = currentUser.getId();
        }

        Long totalSubmissions = entityManager.createQuery(
                "SELECT COUNT(s.id) FROM VendorSubmission s WHERE s.vendor.id = :vendorId", Long.class)
                .setParameter("vendorId", vendorId)
                .getSingleResult();

        Long selectedSubmissions = entityManager.createQuery(
                "SELECT COUNT(s.id) FROM VendorSubmission s WHERE s.vendor.id = :vendorId AND s.status = :status", Long.class)
                .setParameter("vendorId", vendorId)
                .setParameter("status", SubmissionStatus.SELECTED)
                .getSingleResult();

        Long rejectedSubmissions = entityManager.createQuery(
                "SELECT COUNT(s.id) FROM VendorSubmission s WHERE s.vendor.id = :vendorId AND s.status = :status", Long.class)
                .setParameter("vendorId", vendorId)
                .setParameter("status", SubmissionStatus.REJECTED)
                .getSingleResult();

        BigDecimal selectionRate = BigDecimal.ZERO;
        if (totalSubmissions > 0) {
            selectionRate = BigDecimal.valueOf(selectedSubmissions * 100.0)
                    .divide(BigDecimal.valueOf(totalSubmissions), 2, RoundingMode.HALF_UP);
        }

        Double fillRateVal = entityManager.createQuery(
                "SELECT (COUNT(a.id) * 100.0) / COALESCE(SUM(r.quantity), 1) " +
                "FROM ResourceRequisition r LEFT JOIN Assignment a ON a.requisition = r AND a.vendor.id = :vendorId " +
                "WHERE r.id IN (SELECT DISTINCT vs.requisition.id FROM VendorSubmission vs WHERE vs.vendor.id = :vendorId)", Double.class)
                .setParameter("vendorId", vendorId)
                .getSingleResult();
        BigDecimal fillRate = fillRateVal != null ? BigDecimal.valueOf(fillRateVal).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        Long activeAssignments = entityManager.createQuery(
                "SELECT COUNT(a.id) FROM Assignment a WHERE a.vendor.id = :vendorId AND a.status = :status", Long.class)
                .setParameter("vendorId", vendorId)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult();

        BigDecimal totalRevenueGenerated = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci " +
                "WHERE ci.assignment.vendor.id = :vendorId AND ci.status IN (:statuses)", BigDecimal.class)
                .setParameter("vendorId", vendorId)
                .setParameter("statuses", List.of(InvoiceStatus.APPROVED, InvoiceStatus.PAID))
                .getSingleResult();

        return VendorScorecardResponseDTO.builder()
                .vendorId(vendorId)
                .totalSubmissions(totalSubmissions)
                .selectedSubmissions(selectedSubmissions)
                .rejectedSubmissions(rejectedSubmissions)
                .selectionRate(selectionRate)
                .fillRate(fillRate)
                .activeAssignments(activeAssignments)
                .totalRevenueGenerated(totalRevenueGenerated)
                .build();
    }

    @Override
    public BusinessUnitDashboardResponseDTO getBusinessUnitDashboard(String businessUnit) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin, Finance, and Hiring Manager roles can view Business Unit Dashboard.");
        }

        if ("HIRING_MANAGER".equals(role)) {
            String managerBU = currentUser.getOrgUnitId();
            if (managerBU != null) {
                businessUnit = managerBU;
            }
        }

        Long openRequisitions = entityManager.createQuery(
                "SELECT COUNT(r.id) FROM ResourceRequisition r WHERE r.businessUnitId = :bu AND r.status = :status", Long.class)
                .setParameter("bu", businessUnit)
                .setParameter("status", RequisitionStatus.OPEN)
                .getSingleResult();

        Long filledRequisitions = entityManager.createQuery(
                "SELECT COUNT(r.id) FROM ResourceRequisition r WHERE r.businessUnitId = :bu AND r.status = :status", Long.class)
                .setParameter("bu", businessUnit)
                .setParameter("status", RequisitionStatus.FILLED)
                .getSingleResult();

        Long activeContractors = entityManager.createQuery(
                "SELECT COUNT(DISTINCT a.contractorProfile.user.id) FROM Assignment a WHERE a.orgUnitId = :bu AND a.status = :status", Long.class)
                .setParameter("bu", businessUnit)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult();

        BigDecimal totalSpend = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci " +
                "WHERE ci.orgUnitId = :bu AND ci.status IN (:statuses)", BigDecimal.class)
                .setParameter("bu", businessUnit)
                .setParameter("statuses", List.of(InvoiceStatus.APPROVED, InvoiceStatus.PAID))
                .getSingleResult();

        return BusinessUnitDashboardResponseDTO.builder()
                .businessUnit(businessUnit)
                .openRequisitions(openRequisitions)
                .filledRequisitions(filledRequisitions)
                .activeContractors(activeContractors)
                .totalSpend(totalSpend)
                .build();
    }

    @Override
    public SkillDashboardResponseDTO getSkillDashboard(String skill) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view skill dashboards.");
        }

        String orgUnitId = currentUser.getOrgUnitId();
        
        Long contractorsBySkill;
        Long openDemandBySkill;
        BigDecimal fillRateBySkill;
        
        if ("HIRING_MANAGER".equals(role)) {
            if (orgUnitId == null) {
                throw new IllegalStateException("Hiring Manager does not have an orgUnitId assigned.");
            }
            
            contractorsBySkill = entityManager.createQuery(
                    "SELECT COUNT(DISTINCT cs.contractorProfile.user.id) FROM ContractorSkill cs " +
                    "WHERE cs.skill.name = :skill " +
                    "AND cs.contractorProfile.id IN (" +
                    "   SELECT a.contractorProfile.id FROM Assignment a WHERE a.orgUnitId = :orgUnitId" +
                    ")", Long.class)
                    .setParameter("skill", skill)
                    .setParameter("orgUnitId", orgUnitId)
                    .getSingleResult();
            
            openDemandBySkill = entityManager.createQuery(
                    "SELECT COALESCE(SUM(r.quantity), 0L) FROM ResourceRequisition r " +
                    "WHERE r.requiredSkill.name = :skill AND r.status = :status AND r.orgUnitId = :orgUnitId", Long.class)
                    .setParameter("skill", skill)
                    .setParameter("status", RequisitionStatus.OPEN)
                    .setParameter("orgUnitId", orgUnitId)
                    .getSingleResult();
            
            Double fillRateBySkillVal = entityManager.createQuery(
                    "SELECT (COUNT(a.id) * 100.0) / COALESCE(SUM(r.quantity), 1) " +
                    "FROM ResourceRequisition r LEFT JOIN Assignment a ON a.requisition = r " +
                    "WHERE r.requiredSkill.name = :skill AND r.status <> :draftStatus AND r.orgUnitId = :orgUnitId", Double.class)
                    .setParameter("skill", skill)
                    .setParameter("draftStatus", RequisitionStatus.DRAFT)
                    .setParameter("orgUnitId", orgUnitId)
                    .getSingleResult();
            fillRateBySkill = fillRateBySkillVal != null ? BigDecimal.valueOf(fillRateBySkillVal).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            
        } else {
            contractorsBySkill = entityManager.createQuery(
                    "SELECT COUNT(DISTINCT cs.contractorProfile.user.id) FROM ContractorSkill cs " +
                    "WHERE cs.skill.name = :skill", Long.class)
                    .setParameter("skill", skill)
                    .getSingleResult();

            openDemandBySkill = entityManager.createQuery(
                    "SELECT COALESCE(SUM(r.quantity), 0L) FROM ResourceRequisition r " +
                    "WHERE r.requiredSkill.name = :skill AND r.status = :status", Long.class)
                    .setParameter("skill", skill)
                    .setParameter("status", RequisitionStatus.OPEN)
                    .getSingleResult();

            Double fillRateBySkillVal = entityManager.createQuery(
                    "SELECT (COUNT(a.id) * 100.0) / COALESCE(SUM(r.quantity), 1) " +
                    "FROM ResourceRequisition r LEFT JOIN Assignment a ON a.requisition = r " +
                    "WHERE r.requiredSkill.name = :skill AND r.status <> :draftStatus", Double.class)
                    .setParameter("skill", skill)
                    .setParameter("draftStatus", RequisitionStatus.DRAFT)
                    .getSingleResult();
            fillRateBySkill = fillRateBySkillVal != null ? BigDecimal.valueOf(fillRateBySkillVal).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        }

        return SkillDashboardResponseDTO.builder()
                .skill(skill)
                .contractorsBySkill(contractorsBySkill)
                .openDemandBySkill(openDemandBySkill)
                .fillRateBySkill(fillRateBySkill)
                .build();
    }

    @Override
    public Long getComplianceExpiryCount(Integer days) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }
        
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"VENDOR_MANAGER".equals(role) && !"VENDOR".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view compliance expiries.");
        }
        
        int thresholdDays = (days != null) ? days : 30;
        LocalDate endDate = LocalDate.now().plusDays(thresholdDays);

        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            return entityManager.createQuery(
                    "SELECT COUNT(c.id) FROM ContractorCertification c " +
                    "WHERE c.expiryDate BETWEEN :today AND :endDate " +
                    "AND c.contractorProfile.id IN (" +
                    "   SELECT a.contractorProfile.id FROM Assignment a WHERE a.vendor.id = :vendorId" +
                    ")", Long.class)
                    .setParameter("today", LocalDate.now())
                    .setParameter("endDate", endDate)
                    .setParameter("vendorId", currentUser.getId())
                    .getSingleResult();
        }

        return entityManager.createQuery(
                "SELECT COUNT(c.id) FROM ContractorCertification c " +
                "WHERE c.expiryDate BETWEEN :today AND :endDate", Long.class)
                .setParameter("today", LocalDate.now())
                .setParameter("endDate", endDate)
                .getSingleResult();
    }

    @Override
    public PersonalDashboardResponseDTO getPersonalDashboard() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        if (!"CONTRACTOR".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Contractors can view the Personal Dashboard.");
        }

        String contractorUserId = currentUser.getId();

        Long activeAssignmentsCount = entityManager.createQuery(
                "SELECT COUNT(a.id) FROM Assignment a WHERE a.contractorProfile.user.id = :userId AND a.status = :status", Long.class)
                .setParameter("userId", contractorUserId)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult();

        Double totalHoursVal = entityManager.createQuery(
                "SELECT COALESCE(SUM(tl.hoursWorked), 0.0) FROM TimesheetLine tl WHERE tl.timesheet.contractor.user.id = :userId AND tl.timesheet.status = :status", Double.class)
                .setParameter("userId", contractorUserId)
                .setParameter("status", TimesheetStatus.APPROVED)
                .getSingleResult();
        BigDecimal totalHoursLogged = totalHoursVal != null ? BigDecimal.valueOf(totalHoursVal).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        Long pendingTimesheetsCount = entityManager.createQuery(
                "SELECT COUNT(t.id) FROM Timesheet t WHERE t.contractor.user.id = :userId AND t.status = :status", Long.class)
                .setParameter("userId", contractorUserId)
                .setParameter("status", TimesheetStatus.SUBMITTED)
                .getSingleResult();

        BigDecimal totalPaidAmount = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci WHERE ci.contractor.user.id = :userId AND ci.status = :status", BigDecimal.class)
                .setParameter("userId", contractorUserId)
                .setParameter("status", InvoiceStatus.PAID)
                .getSingleResult();

        return PersonalDashboardResponseDTO.builder()
                .activeAssignmentsCount(activeAssignmentsCount)
                .totalHoursLogged(totalHoursLogged)
                .pendingTimesheetsCount(pendingTimesheetsCount)
                .totalPaidAmount(totalPaidAmount)
                .build();
    }

    @Override
    public ExecutiveDashboardResponseDTO getFilteredReport(
            LocalDate startDate,
            LocalDate endDate,
            String orgUnitId,
            String vendorId,
            String contractorId,
            String skill,
            String assignmentStatus,
            String invoiceStatus,
            String timesheetStatus) {
        
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        
        // Enforce RBAC filtering:
        if ("HIRING_MANAGER".equals(role)) {
            orgUnitId = currentUser.getOrgUnitId();
        }
        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            vendorId = currentUser.getId();
        }
        if ("CONTRACTOR".equals(role)) {
            contractorId = currentUser.getId();
        }

        // Active Contractors Count
        StringBuilder acQuery = new StringBuilder("SELECT COUNT(DISTINCT a.contractorProfile.user.id) FROM Assignment a WHERE 1=1");
        if (assignmentStatus != null && !assignmentStatus.isEmpty()) {
            acQuery.append(" AND a.status = :assignmentStatus");
        } else {
            acQuery.append(" AND a.status = :assignmentStatus");
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            acQuery.append(" AND a.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            acQuery.append(" AND a.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            acQuery.append(" AND a.contractorProfile.id = :contractorId");
        }
        if (skill != null && !skill.isEmpty()) {
            acQuery.append(" AND EXISTS (SELECT cs FROM ContractorSkill cs WHERE cs.contractorProfile = a.contractorProfile AND cs.skill.name = :skill)");
        }
        if (startDate != null) {
            acQuery.append(" AND a.startDate >= :startDate");
        }
        if (endDate != null) {
            acQuery.append(" AND a.endDate <= :endDate");
        }

        var q1 = entityManager.createQuery(acQuery.toString(), Long.class);
        if (assignmentStatus != null && !assignmentStatus.isEmpty()) {
            try { q1.setParameter("assignmentStatus", AssignmentStatus.valueOf(assignmentStatus.toUpperCase().trim())); } catch(Exception e){}
        } else {
            q1.setParameter("assignmentStatus", AssignmentStatus.ACTIVE);
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) q1.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q1.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q1.setParameter("contractorId", contractorId);
        if (skill != null && !skill.isEmpty()) q1.setParameter("skill", skill);
        if (startDate != null) q1.setParameter("startDate", startDate);
        if (endDate != null) q1.setParameter("endDate", endDate);
        Long activeContractors = q1.getSingleResult();

        // Total Spend
        StringBuilder tsQuery = new StringBuilder("SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci WHERE 1=1");
        if (invoiceStatus != null && !invoiceStatus.isEmpty()) {
            tsQuery.append(" AND ci.status = :invoiceStatus");
        } else {
            tsQuery.append(" AND ci.status IN (:invoiceStatuses)");
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            tsQuery.append(" AND ci.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            tsQuery.append(" AND ci.assignment.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            tsQuery.append(" AND ci.contractor.id = :contractorId");
        }
        if (startDate != null) {
            tsQuery.append(" AND ci.billingStartDate >= :startDate");
        }
        if (endDate != null) {
            tsQuery.append(" AND ci.billingEndDate <= :endDate");
        }

        var q2 = entityManager.createQuery(tsQuery.toString(), BigDecimal.class);
        if (invoiceStatus != null && !invoiceStatus.isEmpty()) {
            try { q2.setParameter("invoiceStatus", InvoiceStatus.valueOf(invoiceStatus.toUpperCase().trim())); } catch(Exception e){}
        } else {
            q2.setParameter("invoiceStatuses", List.of(InvoiceStatus.APPROVED, InvoiceStatus.PAID));
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) q2.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q2.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q2.setParameter("contractorId", contractorId);
        if (startDate != null) q2.setParameter("startDate", startDate);
        if (endDate != null) q2.setParameter("endDate", endDate);
        BigDecimal totalSpend = q2.getSingleResult();

        // Open Requisitions Count
        StringBuilder openReqQuery = new StringBuilder("SELECT COUNT(r.id) FROM ResourceRequisition r WHERE 1=1");
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            openReqQuery.append(" AND r.orgUnitId = :orgUnitId");
        }
        if (skill != null && !skill.isEmpty()) {
            openReqQuery.append(" AND r.requiredSkill.name = :skill");
        }
        if (startDate != null) {
            openReqQuery.append(" AND r.startDate >= :startDate");
        }
        openReqQuery.append(" AND r.status = :reqStatus");

        var q3 = entityManager.createQuery(openReqQuery.toString(), Long.class);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q3.setParameter("orgUnitId", orgUnitId);
        if (skill != null && !skill.isEmpty()) q3.setParameter("skill", skill);
        if (startDate != null) q3.setParameter("startDate", startDate);
        q3.setParameter("reqStatus", RequisitionStatus.OPEN);
        Long openRequisitions = q3.getSingleResult();

        // Active Assignments
        StringBuilder activeAssignQuery = new StringBuilder("SELECT COUNT(a.id) FROM Assignment a WHERE a.status = :assignStatus");
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            activeAssignQuery.append(" AND a.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            activeAssignQuery.append(" AND a.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            activeAssignQuery.append(" AND a.contractorProfile.id = :contractorId");
        }
        if (startDate != null) {
            activeAssignQuery.append(" AND a.startDate >= :startDate");
        }
        if (endDate != null) {
            activeAssignQuery.append(" AND a.endDate <= :endDate");
        }

        var q4 = entityManager.createQuery(activeAssignQuery.toString(), Long.class);
        q4.setParameter("assignStatus", AssignmentStatus.ACTIVE);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q4.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q4.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q4.setParameter("contractorId", contractorId);
        if (startDate != null) q4.setParameter("startDate", startDate);
        if (endDate != null) q4.setParameter("endDate", endDate);
        Long activeAssignments = q4.getSingleResult();

        // Approved Timesheets Count
        StringBuilder appTimesheetsQuery = new StringBuilder("SELECT COUNT(t.id) FROM Timesheet t WHERE 1=1");
        if (timesheetStatus != null && !timesheetStatus.isEmpty()) {
            appTimesheetsQuery.append(" AND t.status = :timesheetStatus");
        } else {
            appTimesheetsQuery.append(" AND t.status = :timesheetStatus");
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            appTimesheetsQuery.append(" AND t.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            appTimesheetsQuery.append(" AND t.assignment.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            appTimesheetsQuery.append(" AND t.contractor.id = :contractorId");
        }
        if (startDate != null) {
            appTimesheetsQuery.append(" AND t.weekStartDate >= :startDate");
        }
        if (endDate != null) {
            appTimesheetsQuery.append(" AND t.weekEndDate <= :endDate");
        }

        var q5 = entityManager.createQuery(appTimesheetsQuery.toString(), Long.class);
        if (timesheetStatus != null && !timesheetStatus.isEmpty()) {
            try { q5.setParameter("timesheetStatus", TimesheetStatus.valueOf(timesheetStatus.toUpperCase().trim())); } catch(Exception e){}
        } else {
            q5.setParameter("timesheetStatus", TimesheetStatus.APPROVED);
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) q5.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q5.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q5.setParameter("contractorId", contractorId);
        if (startDate != null) q5.setParameter("startDate", startDate);
        if (endDate != null) q5.setParameter("endDate", endDate);
        Long approvedTimesheets = q5.getSingleResult();

        return ExecutiveDashboardResponseDTO.builder()
                .activeContractors(activeContractors)
                .openRequisitions(openRequisitions)
                .filledRequisitions(0L)
                .activeAssignments(activeAssignments)
                .approvedTimesheets(approvedTimesheets)
                .approvedInvoiceAmount(totalSpend)
                .paidAmount(totalSpend)
                .complianceExpiries(0L)
                .build();
    }

    private Integer getActiveContractorsCount() {
        return entityManager.createQuery(
                "SELECT COUNT(DISTINCT a.contractorProfile.user.id) FROM Assignment a " +
                "WHERE a.status = :status", Long.class)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult()
                .intValue();
    }

    private BigDecimal getTotalSpendValue() {
        return entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci " +
                "WHERE ci.status IN (:statuses)", BigDecimal.class)
                .setParameter("statuses", List.of(InvoiceStatus.APPROVED, InvoiceStatus.PAID))
                .getSingleResult();
    }

    private BigDecimal getFillRateValue() {
        Double result = entityManager.createQuery(
                "SELECT (COUNT(a.id) * 100.0) / COALESCE(SUM(r.quantity), 1) " +
                "FROM ResourceRequisition r LEFT JOIN Assignment a ON a.requisition = r " +
                "WHERE r.status <> :draftStatus", Double.class)
                .setParameter("draftStatus", RequisitionStatus.DRAFT)
                .getSingleResult();
        return result != null ? BigDecimal.valueOf(result).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }

    private BigDecimal getAvgTimeToFillValue() {
        Double result = entityManager.createQuery(
                "SELECT COALESCE(AVG(FUNCTION('DATEDIFF', a.createdAt, r.createdAt)), 0.0) " +
                "FROM Assignment a JOIN a.requisition r", Double.class)
                .getSingleResult();
        return result != null ? BigDecimal.valueOf(result).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }

    private BigDecimal getTimesheetApprovalRateValue() {
        Double result = entityManager.createQuery(
                "SELECT (COUNT(CASE WHEN t.status = :approvedStatus THEN 1 END) * 100.0) / COUNT(t.id) " +
                "FROM Timesheet t WHERE t.status <> :draftStatus", Double.class)
                .setParameter("approvedStatus", TimesheetStatus.APPROVED)
                .setParameter("draftStatus", TimesheetStatus.DRAFT)
                .getSingleResult();
        return result != null ? BigDecimal.valueOf(result).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }

    private WorkforceReportResponseDTO mapToDto(WorkforceReport report) {
        return WorkforceReportResponseDTO.builder()
                .reportId(report.getId())
                .scope(report.getScope())
                .activeContractors(report.getActiveContractors())
                .totalSpend(report.getTotalSpend())
                .fillRate(report.getFillRate())
                .avgTimeToFill(report.getAvgTimeToFill())
                .timesheetApprovalRate(report.getTimesheetApprovalRate())
                .complianceExpiryCount(report.getComplianceExpiryCount())
                .generatedDate(report.getGeneratedDate())
                .build();
    }
}

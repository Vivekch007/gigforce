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
        String targetVendorId = vendorId;

        // IDOR Protection: If current user is VENDOR or VENDOR_MANAGER, ignore requested ID
        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            targetVendorId = currentUser.getId();
        } else if (!"ADMIN".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view vendor scorecards.");
        }

        Long totalSubmissions = entityManager.createQuery(
                "SELECT COUNT(vs.id) FROM VendorSubmission vs WHERE vs.submittedBy.id = :vendorId", Long.class)
                .setParameter("vendorId", targetVendorId)
                .getSingleResult();

        Long selectedSubmissions = entityManager.createQuery(
                "SELECT COUNT(vs.id) FROM VendorSubmission vs WHERE vs.submittedBy.id = :vendorId AND vs.status = :status", Long.class)
                .setParameter("vendorId", targetVendorId)
                .setParameter("status", SubmissionStatus.SELECTED)
                .getSingleResult();

        Long rejectedSubmissions = entityManager.createQuery(
                "SELECT COUNT(vs.id) FROM VendorSubmission vs WHERE vs.submittedBy.id = :vendorId AND vs.status = :status", Long.class)
                .setParameter("vendorId", targetVendorId)
                .setParameter("status", SubmissionStatus.REJECTED)
                .getSingleResult();

        BigDecimal selectionRate = BigDecimal.ZERO;
        if (totalSubmissions > 0) {
            selectionRate = BigDecimal.valueOf(selectedSubmissions * 100.0)
                    .divide(BigDecimal.valueOf(totalSubmissions), 2, RoundingMode.HALF_UP);
        }

        // Fill rate scoped by Vendor submissions
        Double fillRateVal = entityManager.createQuery(
                "SELECT (COUNT(a.id) * 100.0) / COALESCE(SUM(r.quantity), 1) " +
                "FROM ResourceRequisition r LEFT JOIN Assignment a ON a.requisition = r AND a.vendor.id = :vendorId " +
                "WHERE r.id IN (SELECT DISTINCT vs.requisition.id FROM VendorSubmission vs WHERE vs.submittedBy.id = :vendorId)", Double.class)
                .setParameter("vendorId", targetVendorId)
                .getSingleResult();
        BigDecimal fillRate = fillRateVal != null ? BigDecimal.valueOf(fillRateVal).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        Long activeAssignments = entityManager.createQuery(
                "SELECT COUNT(a.id) FROM Assignment a WHERE a.vendor.id = :vendorId AND a.status = :status", Long.class)
                .setParameter("vendorId", targetVendorId)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult();

        BigDecimal totalRevenue = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci " +
                "WHERE ci.purchaseOrder.vendor.id = :vendorId AND ci.status IN (:statuses)", BigDecimal.class)
                .setParameter("vendorId", targetVendorId)
                .setParameter("statuses", List.of(InvoiceStatus.APPROVED, InvoiceStatus.PAID))
                .getSingleResult();

        return VendorScorecardResponseDTO.builder()
                .vendorId(targetVendorId)
                .totalSubmissions(totalSubmissions)
                .selectedSubmissions(selectedSubmissions)
                .rejectedSubmissions(rejectedSubmissions)
                .selectionRate(selectionRate)
                .fillRate(fillRate)
                .activeAssignments(activeAssignments)
                .totalRevenueGenerated(totalRevenue)
                .build();
    }

    @Override
    public BusinessUnitDashboardResponseDTO getBusinessUnitDashboard(String businessUnit) {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        String targetBu = businessUnit;

        // IDOR Protection: If current user is HIRING_MANAGER, ignore requested businessUnit
        if ("HIRING_MANAGER".equals(role)) {
            targetBu = currentUser.getOrgUnitId();
            if (targetBu == null) {
                throw new IllegalStateException("Hiring Manager does not have an orgUnitId assigned.");
            }
        } else if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view Business Unit dashboards.");
        }

        Long activeContractors = entityManager.createQuery(
                "SELECT COUNT(DISTINCT a.contractorProfile.user.id) FROM Assignment a " +
                "WHERE a.requisition.businessUnitId = :bu AND a.status = :status", Long.class)
                .setParameter("bu", targetBu)
                .setParameter("status", AssignmentStatus.ACTIVE)
                .getSingleResult();

        BigDecimal totalSpend = entityManager.createQuery(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci " +
                "WHERE ci.assignment.requisition.businessUnitId = :bu AND ci.status IN (:statuses)", BigDecimal.class)
                .setParameter("bu", targetBu)
                .setParameter("statuses", List.of(InvoiceStatus.APPROVED, InvoiceStatus.PAID))
                .getSingleResult();

        Long openRequisitions = entityManager.createQuery(
                "SELECT COUNT(r.id) FROM ResourceRequisition r " +
                "WHERE r.businessUnitId = :bu AND r.status = :status", Long.class)
                .setParameter("bu", targetBu)
                .setParameter("status", RequisitionStatus.OPEN)
                .getSingleResult();

        Long filledRequisitions = entityManager.createQuery(
                "SELECT COUNT(r.id) FROM ResourceRequisition r " +
                "WHERE r.businessUnitId = :bu AND r.status = :status", Long.class)
                .setParameter("bu", targetBu)
                .setParameter("status", RequisitionStatus.FILLED)
                .getSingleResult();

        return BusinessUnitDashboardResponseDTO.builder()
                .businessUnit(targetBu)
                .activeContractors(activeContractors)
                .totalSpend(totalSpend)
                .openRequisitions(openRequisitions)
                .filledRequisitions(filledRequisitions)
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

        Long contractorsBySkill = entityManager.createQuery(
                "SELECT COUNT(DISTINCT cs.contractorProfile.user.id) FROM ContractorSkill cs " +
                "WHERE cs.skill.name = :skill", Long.class)
                .setParameter("skill", skill)
                .getSingleResult();

        Long openDemandBySkill = entityManager.createQuery(
                "SELECT COALESCE(SUM(r.quantity), 0L) FROM ResourceRequisition r " +
                "WHERE r.requiredSkill.name = :skill AND r.status = :status", Long.class)
                .setParameter("skill", skill)
                .setParameter("status", RequisitionStatus.OPEN)
                .getSingleResult();

        // Skill Fill rate
        Double fillRateBySkillVal = entityManager.createQuery(
                "SELECT (COUNT(a.id) * 100.0) / COALESCE(SUM(r.quantity), 1) " +
                "FROM ResourceRequisition r LEFT JOIN Assignment a ON a.requisition = r " +
                "WHERE r.requiredSkill.name = :skill AND r.status <> :draftStatus", Double.class)
                .setParameter("skill", skill)
                .setParameter("draftStatus", RequisitionStatus.DRAFT)
                .getSingleResult();
        BigDecimal fillRateBySkill = fillRateBySkillVal != null ? BigDecimal.valueOf(fillRateBySkillVal).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        return SkillDashboardResponseDTO.builder()
                .skill(skill)
                .contractorsBySkill(contractorsBySkill)
                .openDemandBySkill(openDemandBySkill)
                .fillRateBySkill(fillRateBySkill)
                .build();
    }

    @Override
    public Long getComplianceExpiryCount(Integer days) {
        int thresholdDays = (days != null) ? days : 30;
        LocalDate endDate = LocalDate.now().plusDays(thresholdDays);

        return entityManager.createQuery(
                "SELECT COUNT(c.id) FROM ContractorCertification c " +
                "WHERE c.expiryDate BETWEEN :today AND :endDate", Long.class)
                .setParameter("today", LocalDate.now())
                .setParameter("endDate", endDate)
                .getSingleResult();
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

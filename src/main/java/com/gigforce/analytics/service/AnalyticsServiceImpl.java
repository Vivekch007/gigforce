package com.gigforce.analytics.service;

import com.gigforce.analytics.dto.*;
import com.gigforce.analytics.entity.WorkforceReport;
import com.gigforce.analytics.repository.WorkforceReportRepository;
import com.gigforce.security.CurrentUserContext;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.invoice.entity.ContractorInvoice;
import com.gigforce.invoice.entity.Payment;
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
        Integer complianceExpiryCount = computeComplianceExpiryCount(30, null).intValue();

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

        Long totalContractors = entityManager.createQuery(
                "SELECT COUNT(cp.id) FROM ContractorProfile cp", Long.class)
                .getSingleResult();

        Long availableContractors = entityManager.createQuery(
                "SELECT COUNT(cp.id) FROM ContractorProfile cp WHERE cp.availabilityStatus = :status", Long.class)
                .setParameter("status", AvailabilityStatus.AVAILABLE)
                .getSingleResult();

        Long contractorsOnAssignment = entityManager.createQuery(
                "SELECT COUNT(cp.id) FROM ContractorProfile cp WHERE cp.availabilityStatus = :status", Long.class)
                .setParameter("status", AvailabilityStatus.ON_ASSIGNMENT)
                .getSingleResult();

        Long pendingTimesheets = entityManager.createQuery(
                "SELECT COUNT(t.id) FROM Timesheet t WHERE t.status = :status", Long.class)
                .setParameter("status", TimesheetStatus.SUBMITTED)
                .getSingleResult();

        Long pendingInvoices = entityManager.createQuery(
                "SELECT COUNT(ci.id) FROM ContractorInvoice ci WHERE ci.status = :status", Long.class)
                .setParameter("status", InvoiceStatus.SUBMITTED)
                .getSingleResult();

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

        Long complianceExpiries = computeComplianceExpiryCount(thresholdDays, null);

        return ExecutiveDashboardResponseDTO.builder()
                .totalContractors(totalContractors)
                .availableContractors(availableContractors)
                .contractorsOnAssignment(contractorsOnAssignment)
                .activeContractors(activeContractors)
                .openRequisitions(openRequisitions)
                .filledRequisitions(filledRequisitions)
                .activeAssignments(activeAssignments)
                .pendingTimesheets(pendingTimesheets)
                .approvedTimesheets(approvedTimesheets)
                .pendingInvoices(pendingInvoices)
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
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin and Hiring Manager roles can view Business Unit Dashboard.");
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
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
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
        if (!"ADMIN".equals(role) && !"VENDOR_MANAGER".equals(role) && !"VENDOR".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view compliance expiries.");
        }

        String vendorId = ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) ? currentUser.getId() : null;
        return computeComplianceExpiryCount(days, vendorId);
    }

    /**
     * Unscoped (global) compliance expiry count, or vendor-scoped when vendorId is supplied.
     * Used both by the public, RBAC-checked {@link #getComplianceExpiryCount(Integer)} and
     * internally by generateReport()/getExecutiveDashboard() (both ADMIN+FINANCE accessible),
     * which must NOT re-run getComplianceExpiryCount's own RBAC check (Finance would be
     * rejected by it since Finance is not in that endpoint's allowed role list).
     */
    private Long computeComplianceExpiryCount(Integer days, String vendorId) {
        int thresholdDays = (days != null) ? days : 30;
        LocalDate endDate = LocalDate.now().plusDays(thresholdDays);

        if (vendorId != null) {
            return entityManager.createQuery(
                    "SELECT COUNT(c.id) FROM ContractorCertification c " +
                    "WHERE c.expiryDate BETWEEN :today AND :endDate " +
                    "AND c.contractorProfile.id IN (" +
                    "   SELECT a.contractorProfile.id FROM Assignment a WHERE a.vendor.id = :vendorId" +
                    ")", Long.class)
                    .setParameter("today", LocalDate.now())
                    .setParameter("endDate", endDate)
                    .setParameter("vendorId", vendorId)
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
    public List<ContractorEarningsResponseDTO> getContractorEarnings() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }

        String role = currentUser.getRole().name();
        if (!"CONTRACTOR".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Contractors can view earnings summary.");
        }

        String contractorUserId = currentUser.getId();

        List<ContractorInvoice> invoices = entityManager.createQuery(
                "SELECT ci FROM ContractorInvoice ci WHERE ci.contractor.user.id = :userId AND ci.status IN (:statuses) ORDER BY ci.invoiceDate DESC", ContractorInvoice.class)
                .setParameter("userId", contractorUserId)
                .setParameter("statuses", List.of(InvoiceStatus.PAID, InvoiceStatus.APPROVED, InvoiceStatus.SUBMITTED))
                .getResultList();

        return invoices.stream().map(ci -> {
            LocalDate baseDate = ci.getBillingEndDate() != null ? ci.getBillingEndDate() : ci.getInvoiceDate();
            String monthDisplay = baseDate != null 
                ? baseDate.getMonth().name().substring(0, 1) + baseDate.getMonth().name().substring(1).toLowerCase() + " " + baseDate.getYear()
                : "Unknown Period";

            String statusDisplay = "Processing";
            if (ci.getStatus() == InvoiceStatus.PAID) {
                statusDisplay = "Paid";
            }

            return ContractorEarningsResponseDTO.builder()
                    .month(monthDisplay)
                    .amountReceived(ci.getInvoiceAmount())
                    .paymentDate(ci.getPaymentDate())
                    .status(statusDisplay)
                    .build();
        }).collect(Collectors.toList());
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
            try { q1.setParameter("assignmentStatus", AssignmentStatus.valueOf(assignmentStatus.toUpperCase().trim())); } catch(Exception e){

            }
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

        // Paid Amount: always the sum of PAID invoices specifically (not the same as total APPROVED+PAID spend)
        StringBuilder paidQuery = new StringBuilder(
                "SELECT COALESCE(SUM(ci.invoiceAmount), 0) FROM ContractorInvoice ci WHERE ci.status = :paidStatus");
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            paidQuery.append(" AND ci.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            paidQuery.append(" AND ci.assignment.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            paidQuery.append(" AND ci.contractor.id = :contractorId");
        }
        if (startDate != null) {
            paidQuery.append(" AND ci.billingStartDate >= :startDate");
        }
        if (endDate != null) {
            paidQuery.append(" AND ci.billingEndDate <= :endDate");
        }

        var q2p = entityManager.createQuery(paidQuery.toString(), BigDecimal.class);
        q2p.setParameter("paidStatus", InvoiceStatus.PAID);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q2p.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q2p.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q2p.setParameter("contractorId", contractorId);
        if (startDate != null) q2p.setParameter("startDate", startDate);
        if (endDate != null) q2p.setParameter("endDate", endDate);
        BigDecimal paidAmount = q2p.getSingleResult();

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

        // Filled Requisitions Count (mirrors Open Requisitions, status FILLED)
        StringBuilder filledReqQuery = new StringBuilder("SELECT COUNT(r.id) FROM ResourceRequisition r WHERE 1=1");
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            filledReqQuery.append(" AND r.orgUnitId = :orgUnitId");
        }
        if (skill != null && !skill.isEmpty()) {
            filledReqQuery.append(" AND r.requiredSkill.name = :skill");
        }
        if (startDate != null) {
            filledReqQuery.append(" AND r.startDate >= :startDate");
        }
        filledReqQuery.append(" AND r.status = :reqStatus");

        var q3f = entityManager.createQuery(filledReqQuery.toString(), Long.class);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q3f.setParameter("orgUnitId", orgUnitId);
        if (skill != null && !skill.isEmpty()) q3f.setParameter("skill", skill);
        if (startDate != null) q3f.setParameter("startDate", startDate);
        q3f.setParameter("reqStatus", RequisitionStatus.FILLED);
        Long filledRequisitions = q3f.getSingleResult();

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

        // Compliance Expiries: certifications expiring in the next 30 days, scoped by the same filters
        LocalDate today = LocalDate.now();
        LocalDate expiryHorizon = today.plusDays(30);
        StringBuilder complianceQuery = new StringBuilder(
                "SELECT COUNT(c.id) FROM ContractorCertification c WHERE c.expiryDate BETWEEN :today AND :expiryHorizon");
        if (contractorId != null && !contractorId.isEmpty()) {
            complianceQuery.append(" AND c.contractorProfile.id = :contractorId");
        }
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            complianceQuery.append(" AND c.contractorProfile.id IN (SELECT a.contractorProfile.id FROM Assignment a WHERE a.orgUnitId = :orgUnitId)");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            complianceQuery.append(" AND c.contractorProfile.id IN (SELECT a2.contractorProfile.id FROM Assignment a2 WHERE a2.vendor.id = :vendorId)");
        }

        var q6 = entityManager.createQuery(complianceQuery.toString(), Long.class);
        q6.setParameter("today", today);
        q6.setParameter("expiryHorizon", expiryHorizon);
        if (contractorId != null && !contractorId.isEmpty()) q6.setParameter("contractorId", contractorId);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q6.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q6.setParameter("vendorId", vendorId);
        Long complianceExpiries = q6.getSingleResult();

        // Pending Timesheets (SUBMITTED, awaiting approval), scoped by the same filters
        StringBuilder pendingTsQuery = new StringBuilder("SELECT COUNT(t.id) FROM Timesheet t WHERE t.status = :pendingStatus");
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            pendingTsQuery.append(" AND t.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            pendingTsQuery.append(" AND t.assignment.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            pendingTsQuery.append(" AND t.contractor.id = :contractorId");
        }

        var q7 = entityManager.createQuery(pendingTsQuery.toString(), Long.class);
        q7.setParameter("pendingStatus", TimesheetStatus.SUBMITTED);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q7.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q7.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q7.setParameter("contractorId", contractorId);
        Long pendingTimesheets = q7.getSingleResult();

        // Pending Invoices (SUBMITTED, awaiting Finance approval), scoped by the same filters
        StringBuilder pendingInvQuery = new StringBuilder("SELECT COUNT(ci.id) FROM ContractorInvoice ci WHERE ci.status = :pendingInvStatus");
        if (orgUnitId != null && !orgUnitId.isEmpty()) {
            pendingInvQuery.append(" AND ci.orgUnitId = :orgUnitId");
        }
        if (vendorId != null && !vendorId.isEmpty()) {
            pendingInvQuery.append(" AND ci.assignment.vendor.id = :vendorId");
        }
        if (contractorId != null && !contractorId.isEmpty()) {
            pendingInvQuery.append(" AND ci.contractor.id = :contractorId");
        }

        var q8 = entityManager.createQuery(pendingInvQuery.toString(), Long.class);
        q8.setParameter("pendingInvStatus", InvoiceStatus.SUBMITTED);
        if (orgUnitId != null && !orgUnitId.isEmpty()) q8.setParameter("orgUnitId", orgUnitId);
        if (vendorId != null && !vendorId.isEmpty()) q8.setParameter("vendorId", vendorId);
        if (contractorId != null && !contractorId.isEmpty()) q8.setParameter("contractorId", contractorId);
        Long pendingInvoices = q8.getSingleResult();

        return ExecutiveDashboardResponseDTO.builder()
                .activeContractors(activeContractors)
                .contractorsOnAssignment(activeContractors)
                .openRequisitions(openRequisitions)
                .filledRequisitions(filledRequisitions)
                .activeAssignments(activeAssignments)
                .pendingTimesheets(pendingTimesheets)
                .approvedTimesheets(approvedTimesheets)
                .pendingInvoices(pendingInvoices)
                .approvedInvoiceAmount(totalSpend)
                .paidAmount(paidAmount)
                .complianceExpiries(complianceExpiries)
                .build();
    }

    // ------------------------------------------------------------------
    // Skill-wise Contractor Distribution card
    // ------------------------------------------------------------------
    @Override
    public List<SkillDistributionResponseDTO> getSkillDistribution() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view skill distribution.");
        }

        StringBuilder jpql = new StringBuilder(
                "SELECT cs.skill.name, COUNT(DISTINCT cs.contractorProfile.id) FROM ContractorSkill cs WHERE 1=1");
        if ("HIRING_MANAGER".equals(role)) {
            jpql.append(" AND cs.contractorProfile.id IN (SELECT a.contractorProfile.id FROM Assignment a WHERE a.orgUnitId = :orgUnitId)");
        }
        jpql.append(" GROUP BY cs.skill.name ORDER BY cs.skill.name");

        var query = entityManager.createQuery(jpql.toString(), Object[].class);
        if ("HIRING_MANAGER".equals(role)) {
            query.setParameter("orgUnitId", currentUser.getOrgUnitId());
        }

        return query.getResultList().stream()
                .map(row -> SkillDistributionResponseDTO.builder()
                        .skill((String) row[0])
                        .contractorCount((Long) row[1])
                        .build())
                .collect(Collectors.toList());
    }

    // ------------------------------------------------------------------
    // Named Reports (Module 7, section 7): Contractor / Requisition / Assignment /
    // Timesheet / Invoice / Payment / Compliance
    // ------------------------------------------------------------------

    @Override
    public List<ContractorReportRowDTO> getContractorReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role) && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view the Contractor Report.");
        }

        StringBuilder jpql = new StringBuilder("SELECT cp FROM ContractorProfile cp WHERE 1=1");
        if ("HIRING_MANAGER".equals(role)) {
            jpql.append(" AND EXISTS (SELECT a FROM Assignment a WHERE a.contractorProfile = cp AND a.orgUnitId = :orgUnitId)");
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            jpql.append(" AND EXISTS (SELECT a2 FROM Assignment a2 WHERE a2.contractorProfile = cp AND a2.vendor.id = :vendorId)");
        }

        var query = entityManager.createQuery(jpql.toString(), ContractorProfile.class);
        if ("HIRING_MANAGER".equals(role)) {
            query.setParameter("orgUnitId", currentUser.getOrgUnitId());
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            query.setParameter("vendorId", currentUser.getId());
        }

        return query.getResultList().stream()
                .map(cp -> ContractorReportRowDTO.builder()
                        .contractorProfileId(cp.getId())
                        .userId(cp.getUser().getId())
                        .name(cp.getUser().getName())
                        .email(cp.getUser().getEmail())
                        .experienceYears(cp.getExperienceYears())
                        .availabilityStatus(cp.getAvailabilityStatus().name())
                        .profileStatus(cp.getProfileStatus().name())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<RequisitionReportRowDTO> getRequisitionReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role) && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view the Requisition Report.");
        }

        StringBuilder jpql = new StringBuilder("SELECT r FROM ResourceRequisition r WHERE 1=1");
        if ("HIRING_MANAGER".equals(role)) {
            jpql.append(" AND r.orgUnitId = :orgUnitId");
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            jpql.append(" AND EXISTS (SELECT vs FROM VendorSubmission vs WHERE vs.requisition = r AND vs.vendor.id = :vendorId)");
        }

        var query = entityManager.createQuery(jpql.toString(), ResourceRequisition.class);
        if ("HIRING_MANAGER".equals(role)) {
            query.setParameter("orgUnitId", currentUser.getOrgUnitId());
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            query.setParameter("vendorId", currentUser.getId());
        }

        return query.getResultList().stream()
                .map(r -> RequisitionReportRowDTO.builder()
                        .requisitionId(r.getId())
                        .title(r.getTitle())
                        .skillName(r.getRequiredSkill().getName())
                        .status(r.getStatus().name())
                        .businessUnitId(r.getBusinessUnitId())
                        .orgUnitId(r.getOrgUnitId())
                        .quantity(r.getQuantity())
                        .maxHourlyRate(r.getMaxHourlyRate())
                        .engagementType(r.getEngagementType().name())
                        .startDate(r.getStartDate())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<AssignmentReportRowDTO> getAssignmentReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role) && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view the Assignment Report.");
        }

        StringBuilder jpql = new StringBuilder("SELECT a FROM Assignment a WHERE 1=1");
        if ("HIRING_MANAGER".equals(role)) {
            jpql.append(" AND a.orgUnitId = :orgUnitId");
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            jpql.append(" AND a.vendor.id = :vendorId");
        }

        var query = entityManager.createQuery(jpql.toString(), Assignment.class);
        if ("HIRING_MANAGER".equals(role)) {
            query.setParameter("orgUnitId", currentUser.getOrgUnitId());
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            query.setParameter("vendorId", currentUser.getId());
        }

        return query.getResultList().stream()
                .map(a -> AssignmentReportRowDTO.builder()
                        .assignmentId(a.getId())
                        .contractorName(a.getContractorProfile().getUser().getName())
                        .hiringManagerName(a.getHiringManager().getName())
                        .vendorName(a.getVendor() != null ? a.getVendor().getName() : null)
                        .status(a.getStatus().name())
                        .agreedRatePerDay(a.getAgreedRatePerDay())
                        .engagementType(a.getEngagementType().name())
                        .startDate(a.getStartDate())
                        .endDate(a.getEndDate())
                        .orgUnitId(a.getOrgUnitId())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<TimesheetReportRowDTO> getTimesheetReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"HIRING_MANAGER".equals(role) && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view the Timesheet Report.");
        }

        StringBuilder jpql = new StringBuilder("SELECT t FROM Timesheet t WHERE 1=1");
        if ("HIRING_MANAGER".equals(role)) {
            jpql.append(" AND t.orgUnitId = :orgUnitId");
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            jpql.append(" AND t.assignment.vendor.id = :vendorId");
        }

        var query = entityManager.createQuery(jpql.toString(), Timesheet.class);
        if ("HIRING_MANAGER".equals(role)) {
            query.setParameter("orgUnitId", currentUser.getOrgUnitId());
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            query.setParameter("vendorId", currentUser.getId());
        }

        return query.getResultList().stream()
                .map(t -> TimesheetReportRowDTO.builder()
                        .timesheetId(t.getId())
                        .assignmentId(t.getAssignment().getId())
                        .contractorName(t.getContractor().getUser().getName())
                        .weekStartDate(t.getWeekStartDate())
                        .weekEndDate(t.getWeekEndDate())
                        .hoursLogged(t.getHoursLogged())
                        .overtimeLogged(t.getOvertimeLogged())
                        .status(t.getStatus().name())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<InvoiceReportRowDTO> getInvoiceReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role) && !"HIRING_MANAGER".equals(role)
                && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view the Invoice Report.");
        }

        StringBuilder jpql = new StringBuilder("SELECT ci FROM ContractorInvoice ci WHERE 1=1");
        if ("HIRING_MANAGER".equals(role)) {
            jpql.append(" AND ci.orgUnitId = :orgUnitId");
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            jpql.append(" AND ci.assignment.vendor.id = :vendorId");
        }

        var query = entityManager.createQuery(jpql.toString(), ContractorInvoice.class);
        if ("HIRING_MANAGER".equals(role)) {
            query.setParameter("orgUnitId", currentUser.getOrgUnitId());
        } else if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            query.setParameter("vendorId", currentUser.getId());
        }

        return query.getResultList().stream()
                .map(ci -> InvoiceReportRowDTO.builder()
                        .invoiceId(ci.getId())
                        .invoiceNumber(ci.getInvoiceNumber())
                        .assignmentId(ci.getAssignment().getId())
                        .contractorName(ci.getContractor().getName())
                        .invoiceAmount(ci.getInvoiceAmount())
                        .status(ci.getStatus().name())
                        .invoiceDate(ci.getInvoiceDate())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<PaymentReportRowDTO> getPaymentReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"FINANCE".equals(role)) {
            throw new AccessDeniedException("Access Denied: Only Admin and Finance roles can view the Payment Report.");
        }

        List<Payment> payments = entityManager.createQuery("SELECT p FROM Payment p", Payment.class).getResultList();

        return payments.stream()
                .map(p -> PaymentReportRowDTO.builder()
                        .paymentId(p.getId())
                        .invoiceId(p.getInvoice().getId())
                        .invoiceNumber(p.getInvoice().getInvoiceNumber())
                        .paidAmount(p.getPaidAmount())
                        .paymentDate(p.getPaymentDate())
                        .paymentMode(p.getPaymentMode().name())
                        .status(p.getStatus().name())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<ComplianceReportRowDTO> getComplianceReport() {
        User currentUser = requireCurrentUser();
        String role = currentUser.getRole().name();
        if (!"ADMIN".equals(role) && !"VENDOR".equals(role) && !"VENDOR_MANAGER".equals(role)) {
            throw new AccessDeniedException("Access Denied: You are not authorized to view the Compliance Report.");
        }

        StringBuilder jpql = new StringBuilder("SELECT c FROM ContractorCertification c WHERE 1=1");
        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            jpql.append(" AND c.contractorProfile.id IN (SELECT a.contractorProfile.id FROM Assignment a WHERE a.vendor.id = :vendorId)");
        }
        jpql.append(" ORDER BY c.expiryDate ASC");

        var query = entityManager.createQuery(jpql.toString(), ContractorCertification.class);
        if ("VENDOR".equals(role) || "VENDOR_MANAGER".equals(role)) {
            query.setParameter("vendorId", currentUser.getId());
        }

        return query.getResultList().stream()
                .map(c -> ComplianceReportRowDTO.builder()
                        .certificationId(c.getId())
                        .contractorProfileId(c.getContractorProfile().getId())
                        .contractorName(c.getContractorProfile().getUser().getName())
                        .certificationName(c.getName())
                        .issuingAuthority(c.getIssuingAuthority())
                        .expiryDate(c.getExpiryDate())
                        .certStatus(c.getCertStatus() != null ? c.getCertStatus().name() : null)
                        .build())
                .collect(Collectors.toList());
    }

    private User requireCurrentUser() {
        User currentUser = currentUserContext.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("Access Denied: Unauthenticated.");
        }
        return currentUser;
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
                        "SELECT (COUNT(CASE WHEN t.status = :approvedStatus THEN 1 ELSE NULL END) * 100.0) / " +
                                "NULLIF(COUNT(t.id), 0) " +
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

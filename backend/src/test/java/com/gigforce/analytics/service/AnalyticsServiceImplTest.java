package com.gigforce.analytics.service;

import com.gigforce.analytics.dto.*;
import com.gigforce.analytics.entity.WorkforceReport;
import com.gigforce.analytics.repository.WorkforceReportRepository;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.security.CurrentUserContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Module 7 - Analytics & Reporting service tests.
 *
 * AnalyticsServiceImpl issues raw JPQL through EntityManager directly (no repository layer for
 * most dashboards/reports), so TypedQuery is mocked with Answers.RETURNS_SELF: any unstubbed
 * setParameter(...) call simply returns the same mock, letting us stub only getSingleResult()/
 * getResultList() per result-type. Where a method issues several same-typed queries in sequence,
 * Mockito's varargs thenReturn(v1, v2, ...) supplies one value per call, in call order -- that
 * order is documented above each test that relies on it.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalyticsServiceImplTest {

    @Mock private WorkforceReportRepository reportRepository;
    @Mock private CurrentUserContext currentUserContext;
    @Mock private EntityManager entityManager;

    @InjectMocks private AnalyticsServiceImpl service;

    private User admin;
    private User finance;
    private User hiringManager;
    private User vendor;
    private User contractor;
    private User vendorManager;

    @BeforeEach
    void setUp() {
        // @InjectMocks uses the 2-arg constructor (reportRepository, currentUserContext); it does
        // NOT fall back to field injection afterwards, so the @PersistenceContext EntityManager
        // field must be wired in manually.
        ReflectionTestUtils.setField(service, "entityManager", entityManager);

        admin = user("ad1", "admin@x.com", UserRole.ADMIN, null);
        finance = user("f1", "fin@x.com", UserRole.FINANCE, null);
        hiringManager = user("hr1", "riya@x.com", UserRole.HIRING_MANAGER, "ORG1");
        vendor = user("v1", "sam@x.com", UserRole.VENDOR, null);
        vendorManager = user("vm1", "vm@x.com", UserRole.VENDOR_MANAGER, null);
        contractor = user("cu1", "arjun@x.com", UserRole.CONTRACTOR, null);
    }

    private User user(String id, String email, UserRole role, String orgUnitId) {
        User u = User.builder().name("N-" + id).email(email).password("h").phone("1234567890")
                .role(role).status(UserStatus.ACTIVE).orgUnitId(orgUnitId).build();
        u.setId(id);
        return u;
    }

    private void actingAs(User u) {
        when(currentUserContext.getCurrentUser()).thenReturn(u);
    }

    @SuppressWarnings("unchecked")
    private <T> TypedQuery<T> mockQuery(Class<T> resultClass) {
        TypedQuery<T> q = mock(TypedQuery.class, Answers.RETURNS_SELF);
        when(entityManager.createQuery(anyString(), eq(resultClass))).thenReturn(q);
        return q;
    }

    // ===================================================================
    // generateReport / getAllReports / getReportById
    // ===================================================================

    @Test
    void generateReport_admin_success_savesSnapshot() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(5L, 2L); // activeContractors, complianceExpiryCount
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(new BigDecimal("1000"));
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(50.0, 3.0, 80.0); // fillRate, avgTimeToFill, approvalRate

        when(reportRepository.save(any(WorkforceReport.class))).thenAnswer(i -> {
            WorkforceReport r = i.getArgument(0);
            r.setId("rep1");
            return r;
        });

        WorkforceReportResponseDTO res = service.generateReport(WorkforceReportRequestDTO.builder().scope("GLOBAL").build());

        assertEquals("rep1", res.getReportId());
        assertEquals(5, res.getActiveContractors());
        assertEquals(0, new BigDecimal("1000").compareTo(res.getTotalSpend()));
        assertEquals(2, res.getComplianceExpiryCount());
    }

    @Test
    void generateReport_finance_success_doesNotThrowFromInternalComplianceCall() {
        // Regression test: computeComplianceExpiryCount must NOT re-run getComplianceExpiryCount's
        // own RBAC check (which excludes FINANCE), or this would incorrectly throw for Finance.
        actingAs(finance);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(1L, 0L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(0.0);
        when(reportRepository.save(any(WorkforceReport.class))).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> service.generateReport(WorkforceReportRequestDTO.builder().scope("GLOBAL").build()));
    }

    @Test
    void generateReport_unauthorizedRole_denied() {
        actingAs(hiringManager);
        assertThrows(AccessDeniedException.class,
                () -> service.generateReport(WorkforceReportRequestDTO.builder().scope("GLOBAL").build()));
    }

    @Test
    void generateReport_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class,
                () -> service.generateReport(WorkforceReportRequestDTO.builder().scope("GLOBAL").build()));
    }

    @Test
    void getAllReports_admin_success() {
        actingAs(admin);
        WorkforceReport r = WorkforceReport.builder().scope("GLOBAL").activeContractors(1)
                .totalSpend(BigDecimal.ZERO).fillRate(BigDecimal.ZERO).avgTimeToFill(BigDecimal.ZERO)
                .timesheetApprovalRate(BigDecimal.ZERO).complianceExpiryCount(0)
                .generatedDate(LocalDateTime.now()).build();
        r.setId("rep1");
        when(reportRepository.findAll()).thenReturn(List.of(r));

        List<WorkforceReportResponseDTO> res = service.getAllReports();
        assertEquals(1, res.size());
    }

    @Test
    void getAllReports_unauthorizedRole_denied() {
        actingAs(vendor);
        assertThrows(AccessDeniedException.class, () -> service.getAllReports());
    }

    @Test
    void getReportById_notFound_throws() {
        actingAs(admin);
        when(reportRepository.findById("x")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.getReportById("x"));
    }

    @Test
    void getReportById_unauthorizedRole_denied() {
        actingAs(contractor);
        assertThrows(AccessDeniedException.class, () -> service.getReportById("rep1"));
    }

    // ===================================================================
    // getExecutiveDashboard
    // ===================================================================

    @Test
    void getExecutiveDashboard_admin_happyPath_mapsAllFigures() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        // Order: activeContractors, totalContractors, availableContractors, contractorsOnAssignment,
        // pendingTimesheets, pendingInvoices, openRequisitions, filledRequisitions, activeAssignments,
        // approvedTimesheets, complianceExpiries (computeComplianceExpiryCount unscoped branch)
        when(longQuery.getSingleResult()).thenReturn(5L, 50L, 20L, 5L, 3L, 2L, 10L, 4L, 8L, 12L, 1L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        // Order: approvedInvoiceAmount, paidAmount
        when(bdQuery.getSingleResult()).thenReturn(new BigDecimal("7000.00"), new BigDecimal("4000.00"));

        ExecutiveDashboardResponseDTO res = service.getExecutiveDashboard(30);

        assertEquals(5L, res.getActiveContractors());
        assertEquals(50L, res.getTotalContractors());
        assertEquals(20L, res.getAvailableContractors());
        assertEquals(5L, res.getContractorsOnAssignment());
        assertEquals(3L, res.getPendingTimesheets());
        assertEquals(2L, res.getPendingInvoices());
        assertEquals(10L, res.getOpenRequisitions());
        assertEquals(4L, res.getFilledRequisitions());
        assertEquals(8L, res.getActiveAssignments());
        assertEquals(12L, res.getApprovedTimesheets());
        assertEquals(1L, res.getComplianceExpiries());
        assertEquals(0, new BigDecimal("7000.00").compareTo(res.getApprovedInvoiceAmount()));
        assertEquals(0, new BigDecimal("4000.00").compareTo(res.getPaidAmount()));
    }

    @Test
    void getExecutiveDashboard_finance_doesNotThrow_regressionForComplianceSelfInvocation() {
        actingAs(finance);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        assertDoesNotThrow(() -> service.getExecutiveDashboard(null));
    }

    @Test
    void getExecutiveDashboard_hiringManager_denied() {
        actingAs(hiringManager);
        assertThrows(AccessDeniedException.class, () -> service.getExecutiveDashboard(30));
    }

    @Test
    void getExecutiveDashboard_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class, () -> service.getExecutiveDashboard(30));
    }

    // ===================================================================
    // getVendorScorecard
    // ===================================================================

    @Test
    void getVendorScorecard_admin_usesRequestedVendorId() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        // Order: totalSubmissions, selectedSubmissions, rejectedSubmissions, activeAssignments
        when(longQuery.getSingleResult()).thenReturn(10L, 4L, 2L, 3L);
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(60.0);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(new BigDecimal("9000.00"));

        VendorScorecardResponseDTO res = service.getVendorScorecard("v1");

        assertEquals("v1", res.getVendorId());
        assertEquals(10L, res.getTotalSubmissions());
        assertEquals(4L, res.getSelectedSubmissions());
        assertEquals(2L, res.getRejectedSubmissions());
        assertEquals(0, new BigDecimal("40.00").compareTo(res.getSelectionRate())); // 4/10*100
        verify(longQuery, atLeastOnce()).setParameter("vendorId", "v1");
    }

    @Test
    void getVendorScorecard_vendorRole_selfScoped_ignoresRequestedId() {
        actingAs(vendor); // id = v1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L);
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(0.0);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        // Attempt to view a DIFFERENT vendor's scorecard; service must force it back to self.
        VendorScorecardResponseDTO res = service.getVendorScorecard("someone-elses-id");

        assertEquals("v1", res.getVendorId());
        verify(longQuery, atLeastOnce()).setParameter("vendorId", "v1");
        verify(longQuery, never()).setParameter("vendorId", "someone-elses-id");
    }

    @Test
    void getVendorScorecard_zeroSubmissions_selectionRateIsZero_noDivisionByZero() {
        actingAs(vendorManager);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L, 0L, 0L, 0L);
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(0.0);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        VendorScorecardResponseDTO res = service.getVendorScorecard(null);
        assertEquals(0, BigDecimal.ZERO.compareTo(res.getSelectionRate()));
    }

    @Test
    void getVendorScorecard_unauthorizedRole_denied() {
        actingAs(hiringManager);
        assertThrows(AccessDeniedException.class, () -> service.getVendorScorecard("v1"));
    }

    // ===================================================================
    // getBusinessUnitDashboard
    // ===================================================================

    @Test
    void getBusinessUnitDashboard_admin_usesRequestedBusinessUnit() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(5L, 2L, 8L); // openReq, filledReq, activeContractors
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(new BigDecimal("3000.00"));

        BusinessUnitDashboardResponseDTO res = service.getBusinessUnitDashboard("FINANCE_BU");

        assertEquals("FINANCE_BU", res.getBusinessUnit());
        assertEquals(5L, res.getOpenRequisitions());
        assertEquals(2L, res.getFilledRequisitions());
        assertEquals(8L, res.getActiveContractors());
        verify(longQuery, atLeastOnce()).setParameter("bu", "FINANCE_BU");
    }

    @Test
    void getBusinessUnitDashboard_hiringManager_overridesToOwnOrgUnit() {
        actingAs(hiringManager); // orgUnitId = ORG1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        BusinessUnitDashboardResponseDTO res = service.getBusinessUnitDashboard("SOME_OTHER_BU");

        assertEquals("ORG1", res.getBusinessUnit());
        verify(longQuery, atLeastOnce()).setParameter("bu", "ORG1");
        verify(longQuery, never()).setParameter("bu", "SOME_OTHER_BU");
    }

    @Test
    void getBusinessUnitDashboard_financeRole_denied_regressionForTightenedScope() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getBusinessUnitDashboard("BU1"));
    }

    @Test
    void getBusinessUnitDashboard_vendorRole_denied() {
        actingAs(vendor);
        assertThrows(AccessDeniedException.class, () -> service.getBusinessUnitDashboard("BU1"));
    }

    // ===================================================================
    // getSkillDashboard
    // ===================================================================

    @Test
    void getSkillDashboard_admin_globalPath() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(6L, 4L); // contractorsBySkill, openDemandBySkill
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(75.0);

        SkillDashboardResponseDTO res = service.getSkillDashboard("Java");

        assertEquals("Java", res.getSkill());
        assertEquals(6L, res.getContractorsBySkill());
        assertEquals(4L, res.getOpenDemandBySkill());
        assertEquals(0, new BigDecimal("75.00").compareTo(res.getFillRateBySkill()));
    }

    @Test
    void getSkillDashboard_hiringManager_scopedPath_usesOrgUnitId() {
        actingAs(hiringManager); // orgUnitId = ORG1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(2L, 1L);
        TypedQuery<Double> dblQuery = mockQuery(Double.class);
        when(dblQuery.getSingleResult()).thenReturn(50.0);

        SkillDashboardResponseDTO res = service.getSkillDashboard("Java");

        assertEquals(2L, res.getContractorsBySkill());
        verify(longQuery, atLeastOnce()).setParameter("orgUnitId", "ORG1");
    }

    @Test
    void getSkillDashboard_hiringManagerWithoutOrgUnit_throws() {
        User hmNoOrg = user("hr9", "noorg@x.com", UserRole.HIRING_MANAGER, null);
        actingAs(hmNoOrg);
        assertThrows(IllegalStateException.class, () -> service.getSkillDashboard("Java"));
    }

    @Test
    void getSkillDashboard_financeRole_denied_regressionForTightenedScope() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getSkillDashboard("Java"));
    }

    // ===================================================================
    // getComplianceExpiryCount
    // ===================================================================

    @Test
    void getComplianceExpiryCount_admin_unscoped() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(7L);

        assertEquals(7L, service.getComplianceExpiryCount(30));
        verify(longQuery, never()).setParameter(eq("vendorId"), any());
    }

    @Test
    void getComplianceExpiryCount_vendor_scopedToSelf() {
        actingAs(vendor); // id = v1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(2L);

        assertEquals(2L, service.getComplianceExpiryCount(null)); // defaults to 30 days
        verify(longQuery).setParameter("vendorId", "v1");
    }

    @Test
    void getComplianceExpiryCount_financeRole_denied_regressionForTightenedScope() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getComplianceExpiryCount(30));
    }

    @Test
    void getComplianceExpiryCount_hiringManager_denied() {
        actingAs(hiringManager);
        assertThrows(AccessDeniedException.class, () -> service.getComplianceExpiryCount(30));
    }

    @Test
    void getComplianceExpiryCount_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class, () -> service.getComplianceExpiryCount(30));
    }

    // ===================================================================
    // getPersonalDashboard
    // ===================================================================

    @Test
    void getPersonalDashboard_contractor_success() {
        actingAs(contractor);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(2L, 1L); // activeAssignmentsCount, pendingTimesheetsCount
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(new BigDecimal("80.00"), new BigDecimal("5000.00"));

        PersonalDashboardResponseDTO res = service.getPersonalDashboard();

        assertEquals(2L, res.getActiveAssignmentsCount());
        assertEquals(1L, res.getPendingTimesheetsCount());
        assertEquals(0, new BigDecimal("80.00").compareTo(res.getTotalHoursLogged()));
        assertEquals(0, new BigDecimal("5000.00").compareTo(res.getTotalPaidAmount()));
    }

    @Test
    void getPersonalDashboard_nonContractor_denied() {
        actingAs(admin);
        assertThrows(AccessDeniedException.class, () -> service.getPersonalDashboard());
    }

    // ===================================================================
    // getFilteredReport - bug-fix regression coverage (filledRequisitions,
    // complianceExpiries, paidAmount) + RBAC scoping
    // ===================================================================

    @Test
    void getFilteredReport_happyPath_filledRequisitionsAndComplianceAndPaidAmountAreReal() {
        actingAs(admin);
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        // Order: activeContractors, openRequisitions, filledRequisitions, activeAssignments,
        // approvedTimesheets, complianceExpiries, pendingTimesheets, pendingInvoices
        when(longQuery.getSingleResult()).thenReturn(5L, 10L, 7L, 8L, 12L, 3L, 4L, 2L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        // Order: totalSpend (approvedInvoiceAmount), paidAmount
        when(bdQuery.getSingleResult()).thenReturn(new BigDecimal("5000.00"), new BigDecimal("3000.00"));

        ExecutiveDashboardResponseDTO res = service.getFilteredReport(
                null, null, null, null, null, null, null, null, null);

        // Previously hardcoded to 0L -- now real, non-zero query results.
        assertEquals(7L, res.getFilledRequisitions());
        assertEquals(3L, res.getComplianceExpiries());
        // Previously paidAmount == approvedInvoiceAmount (same query); now they're distinct.
        assertEquals(0, new BigDecimal("5000.00").compareTo(res.getApprovedInvoiceAmount()));
        assertEquals(0, new BigDecimal("3000.00").compareTo(res.getPaidAmount()));
        assertNotEquals(0, res.getApprovedInvoiceAmount().compareTo(res.getPaidAmount()));
    }

    @Test
    void getFilteredReport_hiringManager_overridesOrgUnitId() {
        actingAs(hiringManager); // orgUnitId = ORG1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        service.getFilteredReport(null, null, "SOME_OTHER_ORG", null, null, null, null, null, null);

        verify(longQuery, atLeastOnce()).setParameter("orgUnitId", "ORG1");
        verify(longQuery, never()).setParameter("orgUnitId", "SOME_OTHER_ORG");
    }

    @Test
    void getFilteredReport_vendor_overridesVendorId() {
        actingAs(vendor); // id = v1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        service.getFilteredReport(null, null, null, "someone-elses-id", null, null, null, null, null);

        verify(longQuery, atLeastOnce()).setParameter("vendorId", "v1");
        verify(longQuery, never()).setParameter("vendorId", "someone-elses-id");
    }

    @Test
    void getFilteredReport_contractor_overridesContractorId() {
        actingAs(contractor); // id = cu1
        TypedQuery<Long> longQuery = mockQuery(Long.class);
        when(longQuery.getSingleResult()).thenReturn(0L);
        TypedQuery<BigDecimal> bdQuery = mockQuery(BigDecimal.class);
        when(bdQuery.getSingleResult()).thenReturn(BigDecimal.ZERO);

        service.getFilteredReport(null, null, null, null, "someone-elses-id", null, null, null, null);

        verify(longQuery, atLeastOnce()).setParameter("contractorId", "cu1");
        verify(longQuery, never()).setParameter("contractorId", "someone-elses-id");
    }

    @Test
    void getFilteredReport_unauthenticated_denied() {
        actingAs(null);
        assertThrows(AccessDeniedException.class,
                () -> service.getFilteredReport(null, null, null, null, null, null, null, null, null));
    }

    // ===================================================================
    // getSkillDistribution
    // ===================================================================

    @Test
    void getSkillDistribution_admin_returnsAllSkills() {
        actingAs(admin);
        TypedQuery<Object[]> query = mockQuery(Object[].class);
        when(query.getResultList()).thenReturn(java.util.Arrays.asList(
                new Object[] { "Java", 5L },
                new Object[] { "React", 3L }));

        List<SkillDistributionResponseDTO> res = service.getSkillDistribution();

        assertEquals(2, res.size());
        assertEquals("Java", res.get(0).getSkill());
        assertEquals(5L, res.get(0).getContractorCount());
        verify(query, never()).setParameter(eq("orgUnitId"), any());
    }

    @Test
    void getSkillDistribution_hiringManager_scopesToOrgUnit() {
        actingAs(hiringManager);
        TypedQuery<Object[]> query = mockQuery(Object[].class);
        when(query.getResultList()).thenReturn(java.util.Collections.singletonList(new Object[] { "Java", 2L }));

        List<SkillDistributionResponseDTO> res = service.getSkillDistribution();

        assertEquals(1, res.size());
        verify(query).setParameter("orgUnitId", "ORG1");
    }

    @Test
    void getSkillDistribution_unauthorizedRole_denied() {
        actingAs(vendor);
        assertThrows(AccessDeniedException.class, () -> service.getSkillDistribution());
    }

    // ===================================================================
    // Named reports: Contractor / Requisition / Assignment / Timesheet /
    // Invoice / Payment / Compliance
    // ===================================================================

    @Test
    void getContractorReport_admin_noScopeParams() {
        actingAs(admin);
        TypedQuery<com.gigforce.identity.entity.ContractorProfile> query =
                mockQuery(com.gigforce.identity.entity.ContractorProfile.class);
        User cu = user("cu2", "cu2@x.com", UserRole.CONTRACTOR, null);
        com.gigforce.identity.entity.ContractorProfile cp = com.gigforce.identity.entity.ContractorProfile.builder()
                .user(cu).experienceYears(5)
                .availabilityStatus(com.gigforce.identity.enums.AvailabilityStatus.AVAILABLE)
                .profileStatus(com.gigforce.identity.enums.ProfileStatus.ACTIVE)
                .build();
        cp.setId("p1");
        when(query.getResultList()).thenReturn(List.of(cp));

        List<ContractorReportRowDTO> res = service.getContractorReport();

        assertEquals(1, res.size());
        assertEquals("p1", res.get(0).getContractorProfileId());
        assertEquals("AVAILABLE", res.get(0).getAvailabilityStatus());
        verify(query, never()).setParameter(eq("orgUnitId"), any());
        verify(query, never()).setParameter(eq("vendorId"), any());
    }

    @Test
    void getContractorReport_hiringManager_scopesByOrgUnit() {
        actingAs(hiringManager);
        TypedQuery<com.gigforce.identity.entity.ContractorProfile> query =
                mockQuery(com.gigforce.identity.entity.ContractorProfile.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getContractorReport();

        verify(query).setParameter("orgUnitId", "ORG1");
    }

    @Test
    void getContractorReport_vendor_scopesByVendorId() {
        actingAs(vendor);
        TypedQuery<com.gigforce.identity.entity.ContractorProfile> query =
                mockQuery(com.gigforce.identity.entity.ContractorProfile.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getContractorReport();

        verify(query).setParameter("vendorId", "v1");
    }

    @Test
    void getContractorReport_unauthorizedRole_denied() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getContractorReport());
    }

    @Test
    void getRequisitionReport_admin_empty() {
        actingAs(admin);
        TypedQuery<com.gigforce.requisition.entity.ResourceRequisition> query =
                mockQuery(com.gigforce.requisition.entity.ResourceRequisition.class);
        when(query.getResultList()).thenReturn(List.of());

        assertTrue(service.getRequisitionReport().isEmpty());
    }

    @Test
    void getRequisitionReport_hiringManager_scopesByOrgUnit() {
        actingAs(hiringManager);
        TypedQuery<com.gigforce.requisition.entity.ResourceRequisition> query =
                mockQuery(com.gigforce.requisition.entity.ResourceRequisition.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getRequisitionReport();

        verify(query).setParameter("orgUnitId", "ORG1");
    }

    @Test
    void getRequisitionReport_unauthorizedRole_denied() {
        actingAs(contractor);
        assertThrows(AccessDeniedException.class, () -> service.getRequisitionReport());
    }

    @Test
    void getAssignmentReport_vendor_scopesByVendorId_andMapsFields() {
        actingAs(vendor);
        TypedQuery<com.gigforce.assignment.entity.Assignment> query =
                mockQuery(com.gigforce.assignment.entity.Assignment.class);

        User cu = user("cu3", "cu3@x.com", UserRole.CONTRACTOR, null);
        com.gigforce.identity.entity.ContractorProfile cp = com.gigforce.identity.entity.ContractorProfile.builder()
                .user(cu).experienceYears(3)
                .availabilityStatus(com.gigforce.identity.enums.AvailabilityStatus.ON_ASSIGNMENT)
                .profileStatus(com.gigforce.identity.enums.ProfileStatus.ACTIVE).build();
        cp.setId("p3");
        com.gigforce.assignment.entity.Assignment a = com.gigforce.assignment.entity.Assignment.builder()
                .contractorProfile(cp).hiringManager(hiringManager).vendor(vendor)
                .status(com.gigforce.assignment.enums.AssignmentStatus.ACTIVE)
                .startDate(java.time.LocalDate.now()).endDate(java.time.LocalDate.now().plusMonths(6))
                .agreedRatePerDay(new BigDecimal("1000")).engagementType(com.gigforce.requisition.enums.EngagementType.REMOTE)
                .orgUnitId("ORG1").build();
        a.setId("a1");
        when(query.getResultList()).thenReturn(List.of(a));

        List<AssignmentReportRowDTO> res = service.getAssignmentReport();

        assertEquals(1, res.size());
        assertEquals("a1", res.get(0).getAssignmentId());
        assertEquals(cu.getName(), res.get(0).getContractorName());
        verify(query).setParameter("vendorId", "v1");
    }

    @Test
    void getAssignmentReport_unauthorizedRole_denied() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getAssignmentReport());
    }

    @Test
    void getTimesheetReport_hiringManager_scopesByOrgUnit() {
        actingAs(hiringManager);
        TypedQuery<com.gigforce.assignment.entity.Timesheet> query =
                mockQuery(com.gigforce.assignment.entity.Timesheet.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getTimesheetReport();

        verify(query).setParameter("orgUnitId", "ORG1");
    }

    @Test
    void getTimesheetReport_unauthorizedRole_denied() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getTimesheetReport());
    }

    @Test
    void getInvoiceReport_finance_fullAccess_noScopeParams() {
        actingAs(finance);
        TypedQuery<com.gigforce.invoice.entity.ContractorInvoice> query =
                mockQuery(com.gigforce.invoice.entity.ContractorInvoice.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getInvoiceReport();

        verify(query, never()).setParameter(eq("orgUnitId"), any());
        verify(query, never()).setParameter(eq("vendorId"), any());
    }

    @Test
    void getInvoiceReport_vendor_scopesByVendorId() {
        actingAs(vendor);
        TypedQuery<com.gigforce.invoice.entity.ContractorInvoice> query =
                mockQuery(com.gigforce.invoice.entity.ContractorInvoice.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getInvoiceReport();

        verify(query).setParameter("vendorId", "v1");
    }

    @Test
    void getInvoiceReport_unauthorizedRole_denied() {
        actingAs(contractor);
        assertThrows(AccessDeniedException.class, () -> service.getInvoiceReport());
    }

    @Test
    void getPaymentReport_finance_success() {
        actingAs(finance);
        TypedQuery<com.gigforce.invoice.entity.Payment> query = mockQuery(com.gigforce.invoice.entity.Payment.class);
        when(query.getResultList()).thenReturn(List.of());

        assertTrue(service.getPaymentReport().isEmpty());
    }

    @Test
    void getPaymentReport_hiringManager_denied_financialReportsOnly() {
        actingAs(hiringManager);
        assertThrows(AccessDeniedException.class, () -> service.getPaymentReport());
    }

    @Test
    void getPaymentReport_vendor_denied() {
        actingAs(vendor);
        assertThrows(AccessDeniedException.class, () -> service.getPaymentReport());
    }

    @Test
    void getComplianceReport_admin_noScopeParams() {
        actingAs(admin);
        TypedQuery<com.gigforce.identity.entity.ContractorCertification> query =
                mockQuery(com.gigforce.identity.entity.ContractorCertification.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getComplianceReport();

        verify(query, never()).setParameter(eq("vendorId"), any());
    }

    @Test
    void getComplianceReport_vendor_scopesByVendorId() {
        actingAs(vendor);
        TypedQuery<com.gigforce.identity.entity.ContractorCertification> query =
                mockQuery(com.gigforce.identity.entity.ContractorCertification.class);
        when(query.getResultList()).thenReturn(List.of());

        service.getComplianceReport();

        verify(query).setParameter("vendorId", "v1");
    }

    @Test
    void getComplianceReport_unauthorizedRole_denied_financeExcluded() {
        actingAs(finance);
        assertThrows(AccessDeniedException.class, () -> service.getComplianceReport());
    }

    @Test
    void getComplianceReport_hiringManager_denied() {
        actingAs(hiringManager);
        assertThrows(AccessDeniedException.class, () -> service.getComplianceReport());
    }
}

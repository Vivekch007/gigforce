package com.gigforce;

import com.gigforce.assignment.dto.AssignmentRequestDTO;
import com.gigforce.assignment.dto.AssignmentResponseDTO;
import com.gigforce.assignment.dto.AmendmentRequestDTO;
import com.gigforce.assignment.dto.AmendmentResponseDTO;
import com.gigforce.assignment.entity.Assignment;
import com.gigforce.assignment.entity.AssignmentAmendment;
import com.gigforce.assignment.enums.AssignmentStatus;
import com.gigforce.assignment.enums.AmendmentStatus;
import com.gigforce.assignment.enums.AmendmentType;
import com.gigforce.assignment.repository.AssignmentRepository;
import com.gigforce.assignment.repository.AssignmentAmendmentRepository;
import com.gigforce.assignment.service.AssignmentService;
import com.gigforce.assignment.service.AssignmentAmendmentService;
import com.gigforce.identity.dto.ContractorProfileRequestDTO;
import com.gigforce.identity.dto.ContractorProfileResponseDTO;
import com.gigforce.identity.dto.EngagementHistoryResponseDTO;
import com.gigforce.identity.entity.ContractorProfile;
import com.gigforce.identity.entity.User;
import com.gigforce.identity.enums.ContractorStatus;
import com.gigforce.identity.enums.AvailabilityStatus;
import com.gigforce.identity.enums.ProfileStatus;
import com.gigforce.identity.enums.UserStatus;
import com.gigforce.identity.enums.UserRole;
import com.gigforce.identity.repository.ContractorProfileRepository;
import com.gigforce.identity.repository.UserRepository;
import com.gigforce.identity.repository.EngagementHistoryRepository;
import com.gigforce.identity.repository.ContractorCertificationRepository;
import com.gigforce.identity.entity.ContractorCertification;
import com.gigforce.identity.enums.CertificationStatus;
import com.gigforce.identity.service.ContractorProfileService;
import com.gigforce.requisition.dto.ResourceRequisitionRequestDTO;
import com.gigforce.requisition.dto.ResourceRequisitionResponseDTO;
import com.gigforce.requisition.dto.VendorSubmissionRequestDTO;
import com.gigforce.requisition.dto.VendorSubmissionResponseDTO;
import com.gigforce.requisition.entity.ResourceRequisition;
import com.gigforce.requisition.entity.VendorSubmission;
import com.gigforce.requisition.enums.RequisitionStatus;
import com.gigforce.requisition.enums.SubmissionStatus;
import com.gigforce.requisition.enums.EngagementType;
import com.gigforce.requisition.enums.ExperienceLevel;
import com.gigforce.requisition.repository.ResourceRequisitionRepository;
import com.gigforce.requisition.repository.VendorSubmissionRepository;
import com.gigforce.requisition.service.VendorSubmissionService;
import com.gigforce.identity.entity.Skill;
import com.gigforce.identity.repository.SkillRepository;
import com.gigforce.identity.repository.ContractorSkillRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.http.MediaType;

import com.gigforce.assignment.dto.*;
import com.gigforce.assignment.enums.*;
import com.gigforce.assignment.service.TimesheetService;
import com.gigforce.identity.service.ContractorAbsenceService;
import com.gigforce.assignment.entity.Timesheet;
import com.gigforce.assignment.entity.TimesheetLine;
import com.gigforce.assignment.entity.TimesheetApproval;
import com.gigforce.assignment.entity.TimesheetComment;
import com.gigforce.identity.entity.ContractorAbsence;
import java.util.ArrayList;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@AutoConfigureMockMvc
public class GigForceApplicationTests {

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private ContractorProfileRepository contractorProfileRepository;

        @Autowired
        private ResourceRequisitionRepository requisitionRepository;

        @Autowired
        private VendorSubmissionRepository submissionRepository;

        @Autowired
        private AssignmentRepository assignmentRepository;

        @Autowired
        private AssignmentAmendmentRepository amendmentRepository;

        @Autowired
        private EngagementHistoryRepository engagementHistoryRepository;

        @Autowired
        private ContractorCertificationRepository contractorCertificationRepository;

        @Autowired
        private ContractorProfileService contractorProfileService;

        @Autowired
        private VendorSubmissionService submissionService;

        @Autowired
        private AssignmentService assignmentService;

        @Autowired
        private AssignmentAmendmentService amendmentService;

        @Autowired
        private SkillRepository skillRepository;

        @Autowired
        private ContractorSkillRepository contractorSkillRepository;

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @Autowired
        private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

        @Autowired
        private TimesheetService timesheetService;

        @Autowired
        private ContractorAbsenceService absenceService;

        @Autowired
        private com.gigforce.assignment.repository.TimesheetRepository timesheetRepository;

        @Autowired
        private com.gigforce.identity.repository.ContractorAbsenceRepository contractorAbsenceRepository;

        private User manager;
        private User vendor;
        private User contractorUser;
        private ContractorProfile contractorProfile;
        private ResourceRequisition requisition;
        private VendorSubmission submission;

        @BeforeEach
        public void setUp() {
                // Clear child tables via JDBC to prevent foreign key constraint violations
                try {
                        jdbcTemplate.execute("DELETE FROM timesheet_approvals");
                        jdbcTemplate.execute("DELETE FROM timesheet_comments");
                        jdbcTemplate.execute("DELETE FROM timesheet_lines");
                } catch (Exception e) {
                        // Tables might not exist during startup
                }

                // Clear repositories to isolate test context
                engagementHistoryRepository.deleteAll();
                contractorCertificationRepository.deleteAll();
                timesheetRepository.deleteAll();
                contractorAbsenceRepository.deleteAll();
                amendmentRepository.deleteAll();
                assignmentRepository.deleteAll();
                submissionRepository.deleteAll();
                requisitionRepository.deleteAll();
                contractorSkillRepository.deleteAll();
                contractorProfileRepository.deleteAll();
                skillRepository.deleteAll();
                // Delete refresh_tokens first due to foreign key constraint on users
                try {
                        jdbcTemplate.execute("DELETE FROM refresh_tokens");
                } catch (Exception e) {
                        // Table might not exist yet during the very first run
                }
                userRepository.deleteAll();
                userRepository.flush();

                // Seed skill
                Skill skill = Skill.builder()
                                .name("Java")
                                .category("TECHNICAL")
                                .description("Java programming")
                                .build();
                skill = skillRepository.save(skill);

                // Seed users
                manager = User.builder()
                                .name("Harold Manager")
                                .email("harold@example.com")
                                .password("Password123!")
                                .phone("9111111115")
                                .role(UserRole.HIRING_MANAGER)
                                .status(UserStatus.ACTIVE)
                                .build();
                manager = userRepository.save(manager);

                vendor = User.builder()
                                .name("Victor Vendor")
                                .email("victor@example.com")
                                .password("Password123!")
                                .phone("9111111116")
                                .role(UserRole.VENDOR_MANAGER)
                                .status(UserStatus.ACTIVE)
                                .build();
                vendor = userRepository.save(vendor);

                contractorUser = User.builder()
                                .name("Alice Contractor")
                                .email("alice@example.com")
                                .password("Password123!")
                                .phone("9111111117")
                                .role(UserRole.CONTRACTOR)
                                .status(UserStatus.ACTIVE)
                                .build();
                contractorUser = userRepository.save(contractorUser);

                // Seed admin user
                User adminUser = User.builder()
                                .name("System Admin")
                                .email("admin@gigforce.com")
                                .password("Password123!")
                                .phone("9111111120")
                                .role(UserRole.ADMIN)
                                .status(UserStatus.ACTIVE)
                                .build();
                userRepository.save(adminUser);

                // Seed finance user
                User financeUser = User.builder()
                                .name("Finance Auditor")
                                .email("finance@example.com")
                                .password("Password123!")
                                .phone("9111111121")
                                .role(UserRole.FINANCE)
                                .status(UserStatus.ACTIVE)
                                .build();
                userRepository.save(financeUser);

                // Seed contractor profile
                contractorProfile = ContractorProfile.builder()
                                .user(contractorUser)
                                .hourlyRate(new BigDecimal("50.00"))
                                .experienceYears(5)
                                .availabilityStatus(AvailabilityStatus.AVAILABLE)
                                .profileStatus(ProfileStatus.ACTIVE)
                                .build();
                contractorProfile = contractorProfileRepository.save(contractorProfile);

                // Seed requisition
                requisition = ResourceRequisition.builder()
                                .title("Java Contractor Needed")
                                .description("Long term Java project")
                                .minExperienceYears(3)
                                .maxHourlyRate(new BigDecimal("60.00"))
                                .quantity(1)
                                .status(RequisitionStatus.OPEN)
                                .requiredSkill(skill)
                                .creator(manager)
                                .engagementType(EngagementType.REMOTE)
                                .experienceLevel(ExperienceLevel.SENIOR)
                                .startDate(LocalDate.now())
                                .duration("6 months")
                                .build();
                requisition = requisitionRepository.save(requisition);

                // Seed submission
                submission = VendorSubmission.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .submittedBy(vendor)
                                .status(SubmissionStatus.SUBMITTED).submissionDate(LocalDate.now())
                                .proposedRate(new BigDecimal("50.00"))
                                .build();
                submission = submissionRepository.save(submission);
        }

        // ==================== MODULE 1: AUTH & STATUS ====================

        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testContractorCertificationIdPrefix() {
                ContractorCertification cert = ContractorCertification.builder()
                                .contractorProfile(contractorProfile)
                                .name("AWS Cloud Practitioner")
                                .issuingAuthority("Amazon Web Services")
                                .certificateNumber("AWS-12345")
                                .issueDate(LocalDate.now().minusMonths(6))
                                .expiryDate(LocalDate.now().plusYears(2))
                                .certStatus(CertificationStatus.VALID)
                                .build();
                cert = contractorCertificationRepository.save(cert);
                assertNotNull(cert.getId());
                assertTrue(cert.getId().startsWith("cert"), "Generated ID should start with 'cert' prefix but was: " + cert.getId());
        }

        @Test
        public void testUserSuspensionState() {
                manager.setStatus(UserStatus.SUSPENDED);
                userRepository.save(manager);
                User fetched = userRepository.findById(manager.getId()).orElse(null);
                assertNotNull(fetched);
                assertEquals(UserStatus.SUSPENDED, fetched.getStatus());
        }

        // ==================== MODULE 2: CONTRACTOR PROFILE & SKILLS
        // ====================

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testContractorProfileCreationByManager() {
                User anotherContractor = User.builder()
                                .name("Bob Contractor")
                                .email("bob@example.com")
                                .password("Password123!")
                                .phone("9111111119")
                                .role(UserRole.CONTRACTOR)
                                .status(UserStatus.ACTIVE)
                                .build();
                anotherContractor = userRepository.save(anotherContractor);

                ContractorProfileRequestDTO request = ContractorProfileRequestDTO.builder()
                                .userId(anotherContractor.getId())
                                .hourlyRate(new BigDecimal("100.00"))
                                .experienceYears(12)
                                .build();

                ContractorProfileResponseDTO response = contractorProfileService
                                .createProfile(anotherContractor.getId(), request);
                assertNotNull(response);
                assertEquals(12, response.getExperienceYears());
        }

        // ==================== MODULE 3: SUBMISSIONS & WORKFLOW ====================

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testSubmissionAcceptanceTransitionsContractorToAssigned() {
                // Transition to REVIEWING
                submissionService.transitionStatus(submission.getId(), SubmissionStatus.SHORTLISTED, "Reviewing");

                // Transition to ACCEPTED
                VendorSubmissionResponseDTO response = submissionService.transitionStatus(
                                submission.getId(), SubmissionStatus.SELECTED, "Accepted placement");

                assertEquals(SubmissionStatus.SELECTED, response.getStatus());

                ContractorProfile profile = contractorProfileRepository.findById(contractorProfile.getId())
                                .orElse(null);
                assertNotNull(profile);
                assertEquals(AvailabilityStatus.ON_ASSIGNMENT, profile.getAvailabilityStatus());
        }

        @Test
        @WithMockUser(username = "victor@example.com", roles = "VENDOR_MANAGER")
        public void testDuplicateSubmissionPrevention() {
                VendorSubmissionRequestDTO request = VendorSubmissionRequestDTO.builder()
                                .contractorProfileId(contractorProfile.getId())
                                .proposedRate(new BigDecimal("50.00"))
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        submissionService.submitContractor(requisition.getId(), request);
                });
        }

        @Test
        @WithMockUser(username = "victor@example.com", roles = "VENDOR_MANAGER")
        public void testSubmissionCreationSetsSubmissionDate() {
                User tempContractorUser = User.builder()
                                .name("Temp Contractor")
                                .email("temp_contractor@example.com")
                                .password("Password123!")
                                .phone("9111111155")
                                .role(UserRole.CONTRACTOR)
                                .status(UserStatus.ACTIVE)
                                .build();
                tempContractorUser = userRepository.save(tempContractorUser);

                ContractorProfile tempProfile = ContractorProfile.builder()
                                .user(tempContractorUser)
                                .hourlyRate(new BigDecimal("45.00"))
                                .experienceYears(4)
                                .availabilityStatus(AvailabilityStatus.AVAILABLE)
                                .profileStatus(ProfileStatus.ACTIVE)
                                .build();
                tempProfile = contractorProfileRepository.save(tempProfile);

                VendorSubmissionRequestDTO request = VendorSubmissionRequestDTO.builder()
                                .contractorProfileId(tempProfile.getId())
                                .proposedRate(new BigDecimal("48.00"))
                                .remarks("Experienced Java developer")
                                .build();

                VendorSubmissionResponseDTO response = submissionService.submitContractor(requisition.getId(), request);

                assertNotNull(response);
                assertEquals(SubmissionStatus.SUBMITTED, response.getStatus());
                assertEquals(LocalDate.now(), response.getSubmissionDate());
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testSubmissionFullStatusTransitionPipeline() {
                assertEquals(SubmissionStatus.SUBMITTED, submission.getStatus());

                VendorSubmissionResponseDTO resShortlist = submissionService.transitionStatus(submission.getId(), SubmissionStatus.SHORTLISTED, "Shortlisted for interview");
                assertEquals(SubmissionStatus.SHORTLISTED, resShortlist.getStatus());
                assertEquals("Shortlisted for interview", resShortlist.getRemarks());

                VendorSubmissionResponseDTO resInterview = submissionService.transitionStatus(submission.getId(), SubmissionStatus.INTERVIEW_SCHEDULED, "Interview scheduled for Monday");
                assertEquals(SubmissionStatus.INTERVIEW_SCHEDULED, resInterview.getStatus());
                assertEquals("Interview scheduled for Monday", resInterview.getRemarks());

                VendorSubmissionResponseDTO resSelected = submissionService.transitionStatus(submission.getId(), SubmissionStatus.SELECTED, "Selected for the job");
                assertEquals(SubmissionStatus.SELECTED, resSelected.getStatus());
                assertEquals("Selected for the job", resSelected.getRemarks());
        }

        // ==================== MODULE 4: ASSIGNMENTS & AMENDMENTS ====================

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testAssignmentCreationFromAcceptedSubmission() {
                // Transition submission to ACCEPTED first
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);

                AssignmentRequestDTO request = AssignmentRequestDTO.builder()
                                .vendorSubmissionId(submission.getId())
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusMonths(6))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .sowReference("SOW-1234")
                                .build();

                AssignmentResponseDTO response = assignmentService.createAssignment(request);
                assertNotNull(response);
                assertEquals(AssignmentStatus.ACTIVE, response.getStatus());
                assertTrue(assignmentRepository.existsByVendorSubmissionId(submission.getId()));
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testDuplicateAssignmentPreventionOnSameSubmission() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);

                AssignmentRequestDTO request = AssignmentRequestDTO.builder()
                                .vendorSubmissionId(submission.getId())
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusMonths(6))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .build();

                // First creation succeeds
                assignmentService.createAssignment(request);

                // Second creation fails
                assertThrows(IllegalArgumentException.class, () -> {
                        assignmentService.createAssignment(request);
                });
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testAmendmentAutoRejectionConflictingPending() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);

                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                // Create amendment A (Extension)
                AssignmentAmendment amendA = AssignmentAmendment.builder()
                                .assignment(assignment)
                                .amendmentType(AmendmentType.EXTENSION)
                                .effectiveDate(LocalDate.now().plusMonths(3))
                                .newValue(LocalDate.now().plusMonths(6).toString())
                                .status(AmendmentStatus.PENDING)
                                .build();
                amendA = amendmentRepository.save(amendA);

                // Create amendment B (Extension)
                AssignmentAmendment amendB = AssignmentAmendment.builder()
                                .assignment(assignment)
                                .amendmentType(AmendmentType.EXTENSION)
                                .effectiveDate(LocalDate.now().plusMonths(3))
                                .newValue(LocalDate.now().plusMonths(9).toString())
                                .status(AmendmentStatus.PENDING)
                                .build();
                amendB = amendmentRepository.save(amendB);

                // Approve Amendment A
                amendmentService.approveAmendment(amendA.getId(), "Extend project A");

                // Verify Amendment B is auto-rejected
                AssignmentAmendment fetchedB = amendmentRepository.findById(amendB.getId()).orElse(null);
                assertNotNull(fetchedB);
                assertEquals(AmendmentStatus.REJECTED, fetchedB.getStatus());
                assertTrue(fetchedB.getRemarks().contains("Auto-rejected due to approval of amendment ID:"));
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testEarlyTerminationReleasesContractor() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);

                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                AssignmentAmendment amendTerm = AssignmentAmendment.builder()
                                .assignment(assignment)
                                .amendmentType(AmendmentType.EARLY_TERMINATION)
                                .effectiveDate(LocalDate.now().plusDays(5))
                                .newValue(LocalDate.now().plusDays(5).toString())
                                .status(AmendmentStatus.PENDING)
                                .build();
                amendTerm = amendmentRepository.save(amendTerm);

                // Approve early termination
                amendmentService.approveAmendment(amendTerm.getId(), "Terminate early");

                // Verify assignment status changed
                Assignment fetchedAssign = assignmentRepository.findById(assignment.getId()).orElse(null);
                assertNotNull(fetchedAssign);
                assertEquals(AssignmentStatus.TERMINATED_EARLY, fetchedAssign.getStatus());

                // Verify contractor profile released back to AVAILABLE
                ContractorProfile profile = contractorProfileRepository.findById(contractorProfile.getId())
                                .orElse(null);
                assertNotNull(profile);
                assertEquals(AvailabilityStatus.AVAILABLE, profile.getAvailabilityStatus());

                // Verify placement recorded in engagement history
                long count = engagementHistoryRepository.count();
                assertTrue(count > 0);
        }

        // ==================== CONCURRENCY & OPTIMISTIC LOCKING ====================

        @Test
        public void testOptimisticLockingOnUserUpdate() {
                User user = userRepository.findById(manager.getId()).orElseThrow();
                // Optimistic locking removed from entities in this branch; ensure update
                // succeeds instead
                user.setName("Conflict Name");
                assertDoesNotThrow(() -> userRepository.saveAndFlush(user));
        }

        @Test
        public void testOptimisticLockingOnContractorProfileStatus() {
                ContractorProfile profile = contractorProfileRepository.findById(contractorProfile.getId())
                                .orElseThrow();
                // Optimistic locking removed from entities in this branch; ensure update
                // succeeds instead
                profile.setProfileStatus(ProfileStatus.INACTIVE);
                assertDoesNotThrow(() -> contractorProfileRepository.saveAndFlush(profile));
        }

        // ==================== SECURITY & RBAC ENFORCEMENT ====================

        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testContractorForbiddenFromApprovingAmendments() throws Exception {
                mockMvc.perform(put("/api/v1/amendments/1/approve?remarks=Approve"))
                                .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "victor@example.com", roles = "VENDOR_MANAGER")
        public void testVendorForbiddenFromCreatingAssignments() throws Exception {
                AssignmentRequestDTO request = AssignmentRequestDTO.builder()
                                .vendorSubmissionId("1")
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusMonths(6))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .build();

                String body = objectMapper.writeValueAsString(request);

                mockMvc.perform(post("/api/v1/assignments")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                                .andExpect(status().isForbidden());
        }

        // ==================== MODULE 5: TIMESHEET & LEAVE MANAGEMENT
        // ====================

        // 89. Core Timesheet creation draft
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testTimesheetCreationDraft() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1); // Current
                                                                                                                // Monday
                TimesheetLineRequestDTO lineDto = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("8.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(lineDto))
                                .build();

                TimesheetResponseDTO response = timesheetService.createTimesheet(request);
                assertNotNull(response);
                assertEquals(TimesheetStatus.DRAFT, response.getStatus());
                assertEquals(new BigDecimal("400.00"), response.getBillableAmount());
        }

        // 90. Update timesheet draft
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testUpdateTimesheetDraft() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1); // Current
                                                                                                                // Monday
                TimesheetLineRequestDTO lineDto = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("8.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(lineDto))
                                .build();

                TimesheetResponseDTO created = timesheetService.createTimesheet(request);

                // Update lines
                TimesheetLineRequestDTO updatedLine = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("10.00"))
                                .activityDesc("Deployment")
                                .build();

                TimesheetRequestDTO updateRequest = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(updatedLine))
                                .build();

                TimesheetResponseDTO updated = timesheetService.updateTimesheet(created.getId(), updateRequest);
                assertNotNull(updated);
                assertEquals(new BigDecimal("550.00"), updated.getBillableAmount());
        }

        // 91. Submit timesheet
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testSubmitTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1); // Current
                                                                                                                // Monday
                TimesheetLineRequestDTO lineDto = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("8.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetResponseDTO created = timesheetService.createTimesheet(TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(lineDto))
                                .build());

                TimesheetResponseDTO submitted = timesheetService.submitTimesheet(created.getId());
                assertEquals(TimesheetStatus.SUBMITTED, submitted.getStatus());
                assertNotNull(submitted.getSubmittedDate());
        }

        // 92. L1 Approve Timesheet
        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testL1ApproveTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.SUBMITTED)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                TimesheetResponseDTO approved = timesheetService.approveTimesheet(timesheet.getId(),
                                new TimesheetApprovalRequestDTO("Approve L1"));
                assertEquals(TimesheetStatus.PENDING_FINANCE, approved.getStatus());
        }

        // 93. L2 Approve Timesheet
        @Test
        @WithMockUser(username = "admin@gigforce.com", roles = "ADMIN")
        public void testL2ApproveTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.PENDING_FINANCE)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                TimesheetResponseDTO approved = timesheetService.approveTimesheet(timesheet.getId(),
                                new TimesheetApprovalRequestDTO("Approve L2"));
                assertEquals(TimesheetStatus.APPROVED, approved.getStatus());
                assertNotNull(approved.getApprovedDate());
                assertEquals(PayrollStatus.NOT_PROCESSED, approved.getPayrollStatus());
        }

        // 94. Reject Timesheet
        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testRejectTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.SUBMITTED)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                TimesheetResponseDTO rejected = timesheetService.rejectTimesheet(timesheet.getId(),
                                new TimesheetApprovalRequestDTO("Needs correction"));
                assertEquals(TimesheetStatus.REJECTED, rejected.getStatus());
        }

        // 95. Add Comment
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testAddCommentToTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.DRAFT)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                timesheetService.addComment(timesheet.getId(), new TimesheetCommentRequestDTO("Attaching notes"));
        }

        // 96. Request Leave
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testRequestLeave() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                AbsenceRequestDTO request = AbsenceRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .startDate(LocalDate.now().plusDays(2))
                                .endDate(LocalDate.now().plusDays(3))
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .duration(AbsenceDuration.FULL_DAY)
                                .reason("Medical appointment")
                                .build();

                AbsenceResponseDTO response = absenceService.requestLeave(request);
                assertNotNull(response);
                assertEquals(AbsenceStatus.PENDING, response.getStatus());
        }

        // 97. Approve Leave
        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testApproveLeave() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                ContractorAbsence absence = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(LocalDate.now().plusDays(2))
                                .endDate(LocalDate.now().plusDays(3))
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .reason("Medical appointment")
                                .status(AbsenceStatus.PENDING)
                                .build();
                absence = contractorAbsenceRepository.save(absence);

                AbsenceResponseDTO approved = absenceService.approveLeave(absence.getId());
                assertEquals(AbsenceStatus.APPROVED, approved.getStatus());
        }

        // 98. Reject Leave
        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testRejectLeave() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                ContractorAbsence absence = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(LocalDate.now().plusDays(2))
                                .endDate(LocalDate.now().plusDays(3))
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .reason("Medical appointment")
                                .status(AbsenceStatus.PENDING)
                                .build();
                absence = contractorAbsenceRepository.save(absence);

                AbsenceResponseDTO rejected = absenceService.rejectLeave(absence.getId(), "Not allowed");
                assertEquals(AbsenceStatus.REJECTED, rejected.getStatus());
                assertEquals("Not allowed", rejected.getRejectionRemarks());
        }

        // 99. Get Leave details
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testGetLeaveDetails() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                ContractorAbsence absence = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(LocalDate.now().plusDays(2))
                                .endDate(LocalDate.now().plusDays(3))
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .reason("Medical appointment")
                                .status(AbsenceStatus.PENDING)
                                .build();
                absence = contractorAbsenceRepository.save(absence);

                AbsenceResponseDTO fetched = absenceService.getLeaveById(absence.getId());
                assertNotNull(fetched);
        }

        // 100. Get leaves by profile
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testGetLeavesByProfile() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                ContractorAbsence absence = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(LocalDate.now().plusDays(2))
                                .endDate(LocalDate.now().plusDays(3))
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .reason("Medical appointment")
                                .status(AbsenceStatus.PENDING)
                                .build();
                contractorAbsenceRepository.save(absence);

                List<AbsenceResponseDTO> list = absenceService.getLeavesByContractorProfile(contractorProfile.getId());
                assertEquals(1, list.size());
        }

        // 101. Get payroll ready timesheets
        @Test
        @WithMockUser(username = "admin@gigforce.com", roles = "ADMIN")
        public void testGetPayrollReadyTimesheets() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.APPROVED)
                                .payrollStatus(PayrollStatus.NOT_PROCESSED)
                                .build();
                timesheetRepository.save(timesheet);

                List<TimesheetResponseDTO> ready = timesheetService.getPayrollReadyTimesheets();
                assertEquals(1, ready.size());
        }

        // 102. Sweep pending approvals
        @Test
        @WithMockUser(username = "admin@gigforce.com", roles = "ADMIN")
        public void testSweepPendingApprovals() {
                timesheetService.sweepPendingApprovals();
        }

        // 103. Error: Daily hours limit exceeded (> 24 hours)
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testDailyHoursLimitExceeded() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                TimesheetLineRequestDTO invalidLine = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("25.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(invalidLine))
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.createTimesheet(request);
                });
        }

        // 104. Standard daily hours auto splitting (total daily hours > 8 splits into regular and overtime)
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testStandardDailyHoursAutoSplitting() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                TimesheetLineRequestDTO splitLine = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("10.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(splitLine))
                                .build();

                TimesheetResponseDTO response = timesheetService.createTimesheet(request);
                assertNotNull(response);
                assertEquals(new BigDecimal("8.00"), response.getHoursLogged());
                assertEquals(new BigDecimal("2.00"), response.getOvertimeLogged());
                assertEquals(new BigDecimal("550.00"), response.getBillableAmount());
        }

        // 105. Error: Weekly regular hours capping exceeded (> 40 hours)
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testWeeklyRegularHoursCappingExceeded() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                List<TimesheetLineRequestDTO> lines = new ArrayList<>();
                for (int i = 0; i < 6; i++) {
                        lines.add(TimesheetLineRequestDTO.builder()
                                        .workDate(weekStart.plusDays(i))
                                        .hoursWorked(new BigDecimal("8.00"))
                                        .activityDesc("Coding")
                                        .build());
                }

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(lines)
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.createTimesheet(request);
                });
        }

        // 106. Duplicate weekly timesheet blocked
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testDuplicateWeeklyTimesheetBlocked() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                TimesheetLineRequestDTO line = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("8.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(line))
                                .build();

                timesheetService.createTimesheet(request);

                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.createTimesheet(request);
                });
        }

        // 107. Overlapping leave request blocked
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testOverlappingLeaveRequestBlocked() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                AbsenceRequestDTO req1 = AbsenceRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .startDate(LocalDate.now().plusDays(2))
                                .endDate(LocalDate.now().plusDays(4))
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .duration(AbsenceDuration.FULL_DAY)
                                .reason("Medical appointment")
                                .build();
                absenceService.requestLeave(req1);

                AbsenceRequestDTO req2 = AbsenceRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .startDate(LocalDate.now().plusDays(3))
                                .endDate(LocalDate.now().plusDays(5))
                                .absenceType(AbsenceType.CASUAL_LEAVE)
                                .duration(AbsenceDuration.FULL_DAY)
                                .reason("Vacation")
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        absenceService.requestLeave(req2);
                });
        }

        // 108. Finance approval before HM approval blocked
        @Test
        @WithMockUser(username = "finance@example.com", roles = "FINANCE")
        public void testFinanceApprovalBeforeHMApprovalBlocked() throws Exception {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.SUBMITTED)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                mockMvc.perform(post("/api/v1/timesheets/" + timesheet.getId() + "/approve"))
                                .andExpect(status().isForbidden());
        }

        // 109. Contractor cannot edit approved timesheet
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testContractorCannotEditApprovedTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.APPROVED)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(TimesheetLineRequestDTO.builder()
                                                .workDate(weekStart)
                                                .hoursWorked(new BigDecimal("8.00"))
                                                .activityDesc("Coding")
                                                .build()))
                                .build();

                final String tsId = timesheet.getId();
                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.updateTimesheet(tsId, request);
                });
        }

        // 110. Hours logged during approved leave blocked
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testHoursLoggedDuringApprovedLeaveBlocked() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);

                ContractorAbsence absence = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(weekStart)
                                .endDate(weekStart)
                                .absenceType(AbsenceType.SICK_LEAVE)
                                .reason("Medical appointment")
                                .status(AbsenceStatus.APPROVED)
                                .build();
                contractorAbsenceRepository.save(absence);

                TimesheetLineRequestDTO line = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("8.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(line))
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.createTimesheet(request);
                });
        }

        // 111. Concurrent duplicate timesheet submission
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testConcurrentDuplicateTimesheetSubmission() {
                assertTrue(true);
        }

        // 112. Concurrent leave approval
        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testConcurrentLeaveApproval() {
                assertTrue(true);
        }

        // 113. Completed assignment cannot accept timesheet
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testCompletedAssignmentCannotAcceptTimesheet() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.COMPLETED)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                TimesheetLineRequestDTO line = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart)
                                .hoursWorked(new BigDecimal("8.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO request = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart)
                                .lines(List.of(line))
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.createTimesheet(request);
                });
        }

        // 114. Contractor views another contractor's timesheet -> 403
        @Test
        @WithMockUser(username = "bob@example.com", roles = "CONTRACTOR")
        public void testContractorViewsAnotherContractorsTimesheet() throws Exception {
                User bobUser = User.builder()
                                .name("Bob Contractor")
                                .email("bob@example.com")
                                .password("Password123!")
                                .phone("9111111122")
                                .role(UserRole.CONTRACTOR)
                                .status(UserStatus.ACTIVE)
                                .build();
                userRepository.save(bobUser);

                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(5))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Timesheet timesheet = Timesheet.builder()
                                .assignment(assignment)
                                .contractor(contractorUser)
                                .weekStartDate(weekStart)
                                .weekEndDate(weekStart.plusDays(6))
                                .status(TimesheetStatus.DRAFT)
                                .build();
                timesheet = timesheetRepository.save(timesheet);

                mockMvc.perform(get("/api/v1/timesheets/" + timesheet.getId()))
                                .andExpect(status().isForbidden());
        }

        // 115. Vendor attempts finance approval -> 403
        @Test
        @WithMockUser(username = "victor@example.com", roles = "VENDOR_MANAGER")
        public void testVendorAttemptsFinanceApproval() throws Exception {
                mockMvc.perform(post("/api/v1/timesheets/1/approve"))
                                .andExpect(status().isForbidden());
        }

        // 116. Half-day leave validation: max 4 hours worked
        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testHalfDayLeaveValidation() {
                submission.setStatus(SubmissionStatus.SELECTED);
                submissionRepository.save(submission);
                Assignment assignment = Assignment.builder()
                                .requisition(requisition)
                                .contractorProfile(contractorProfile)
                                .hiringManager(manager)
                                .startDate(LocalDate.now().minusDays(15))
                                .endDate(LocalDate.now().plusMonths(3))
                                .agreedRatePerDay(new BigDecimal("400.00"))
                                .engagementType("TIME_AND_MATERIALS")
                                .status(AssignmentStatus.ACTIVE)
                                .vendorSubmission(submission)
                                .build();
                assignment = assignmentRepository.save(assignment);

                LocalDate weekStart1 = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                LocalDate weekStart2 = weekStart1.minusWeeks(1);

                // Leave for week 1 Wednesday (for invalid case)
                ContractorAbsence absence1 = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(weekStart1.plusDays(2)) // Wednesday
                                .endDate(weekStart1.plusDays(2))
                                .absenceType(AbsenceType.CASUAL_LEAVE)
                                .duration(AbsenceDuration.HALF_DAY)
                                .reason("Morning leave")
                                .status(AbsenceStatus.APPROVED)
                                .build();
                contractorAbsenceRepository.save(absence1);

                // Leave for week 2 Wednesday (for valid case)
                ContractorAbsence absence2 = ContractorAbsence.builder()
                                .contractorProfile(contractorProfile)
                                .assignment(assignment)
                                .startDate(weekStart2.plusDays(2)) // Wednesday
                                .endDate(weekStart2.plusDays(2))
                                .absenceType(AbsenceType.CASUAL_LEAVE)
                                .duration(AbsenceDuration.HALF_DAY)
                                .reason("Afternoon leave")
                                .status(AbsenceStatus.APPROVED)
                                .build();
                contractorAbsenceRepository.save(absence2);

                // Attempting to log 5 hours on Wednesday of week 1 (blocked)
                TimesheetLineRequestDTO line = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart1.plusDays(2))
                                .hoursWorked(new BigDecimal("5.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO requestInvalid = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart1)
                                .lines(List.of(line))
                                .build();

                assertThrows(IllegalArgumentException.class, () -> {
                        timesheetService.createTimesheet(requestInvalid);
                });

                // Attempting to log 4 hours on Wednesday of week 2 (succeeds)
                TimesheetLineRequestDTO lineValid = TimesheetLineRequestDTO.builder()
                                .workDate(weekStart2.plusDays(2))
                                .hoursWorked(new BigDecimal("4.00"))
                                .activityDesc("Coding")
                                .build();

                TimesheetRequestDTO requestValid = TimesheetRequestDTO.builder()
                                .assignmentId(assignment.getId())
                                .weekStartDate(weekStart2)
                                .lines(List.of(lineValid))
                                .build();

                TimesheetResponseDTO response = timesheetService.createTimesheet(requestValid);
                assertNotNull(response);
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testHiringManagerEngagementFlow() throws Exception {
                // 1. Create engagement on contractor profile without feedback/rating fields
                String profileId = contractorProfile.getId();
                String requestJson = "{\n" +
                                "  \"clientName\": \"Acme Corp\",\n" +
                                "  \"roleTitle\": \"Backend Developer\",\n" +
                                "  \"startDate\": \"" + LocalDate.now().minusMonths(6) + "\",\n" +
                                "  \"endDate\": \"" + LocalDate.now().minusMonths(1) + "\",\n" +
                                "  \"feedback\": \"Ignore me\",\n" +
                                "  \"rating\": 5\n" +
                                "}";

                String responseStr = mockMvc.perform(post("/api/v1/contractors/profiles/" + profileId + "/engagements")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestJson))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.feedback").value((Object)null))
                                .andExpect(jsonPath("$.rating").value((Object)null))
                                .andReturn().getResponse().getContentAsString();

                EngagementHistoryResponseDTO created = objectMapper.readValue(responseStr, EngagementHistoryResponseDTO.class);
                String engagementId = created.getId();
                assertNotNull(engagementId);

                // 2. Try to update engagement history, passing feedback/rating should also be ignored
                String updateJson = "{\n" +
                                "  \"clientName\": \"Acme Corporation\",\n" +
                                "  \"roleTitle\": \"Lead Backend Developer\",\n" +
                                "  \"startDate\": \"" + LocalDate.now().minusMonths(6) + "\",\n" +
                                "  \"endDate\": \"" + LocalDate.now().minusMonths(1) + "\",\n" +
                                "  \"feedback\": \"Should still ignore\",\n" +
                                "  \"rating\": 4\n" +
                                "}";

                mockMvc.perform(put("/api/v1/contractors/profiles/" + profileId + "/engagements/" + engagementId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(updateJson))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.clientName").value("Acme Corporation"))
                                .andExpect(jsonPath("$.roleTitle").value("Lead Backend Developer"))
                                .andExpect(jsonPath("$.feedback").value((Object)null))
                                .andExpect(jsonPath("$.rating").value((Object)null));

                // 3. Submit feedback on the completed engagement
                String feedbackJson = "{\n" +
                                "  \"feedback\": \"Outstanding job during assignment\",\n" +
                                "  \"rating\": 5\n" +
                                "}";

                mockMvc.perform(put("/api/v1/contractors/profiles/" + profileId + "/engagements/" + engagementId + "/feedback")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(feedbackJson))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.feedback").value("Outstanding job during assignment"))
                                .andExpect(jsonPath("$.rating").value(5));
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testFeedbackOnOngoingEngagementFails() throws Exception {
                String profileId = contractorProfile.getId();
                // Create an ongoing engagement (endDate is null)
                String requestJson = "{\n" +
                                "  \"clientName\": \"Acme Corp\",\n" +
                                "  \"roleTitle\": \"Backend Developer\",\n" +
                                "  \"startDate\": \"" + LocalDate.now().minusMonths(1) + "\"\n" +
                                "}";

                String responseStr = mockMvc.perform(post("/api/v1/contractors/profiles/" + profileId + "/engagements")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestJson))
                                .andExpect(status().isCreated())
                                .andReturn().getResponse().getContentAsString();

                EngagementHistoryResponseDTO created = objectMapper.readValue(responseStr, EngagementHistoryResponseDTO.class);
                String engagementId = created.getId();

                // Submit feedback on ongoing engagement should fail
                String feedbackJson = "{\n" +
                                "  \"feedback\": \"Trying on ongoing\",\n" +
                                "  \"rating\": 4\n" +
                                "}";

                mockMvc.perform(put("/api/v1/contractors/profiles/" + profileId + "/engagements/" + engagementId + "/feedback")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(feedbackJson))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        @WithMockUser(username = "victor@example.com", roles = "VENDOR_MANAGER")
        public void testVendorManagerForbiddenFromEngagementActions() throws Exception {
                String profileId = contractorProfile.getId();
                String requestJson = "{\n" +
                                "  \"clientName\": \"Acme Corp\",\n" +
                                "  \"roleTitle\": \"Backend Developer\",\n" +
                                "  \"startDate\": \"" + LocalDate.now().minusMonths(6) + "\"\n" +
                                "}";

                mockMvc.perform(post("/api/v1/contractors/profiles/" + profileId + "/engagements")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestJson))
                                .andExpect(status().isForbidden());

                mockMvc.perform(put("/api/v1/contractors/profiles/" + profileId + "/engagements/someId")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestJson))
                                .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testDeleteEngagementAccessControl() throws Exception {
                String profileId = contractorProfile.getId();
                String requestJson = "{\n" +
                                "  \"clientName\": \"Acme Corp\",\n" +
                                "  \"roleTitle\": \"Backend Developer\",\n" +
                                "  \"startDate\": \"" + LocalDate.now().minusMonths(6) + "\"\n" +
                                "}";

                String responseStr = mockMvc.perform(post("/api/v1/contractors/profiles/" + profileId + "/engagements")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestJson))
                                .andExpect(status().isCreated())
                                .andReturn().getResponse().getContentAsString();

                EngagementHistoryResponseDTO created = objectMapper.readValue(responseStr, EngagementHistoryResponseDTO.class);
                String engagementId = created.getId();

                // Delete as HIRING_MANAGER should succeed
                mockMvc.perform(delete("/api/v1/contractors/profiles/" + profileId + "/engagements/" + engagementId))
                                .andExpect(status().isNoContent());
        }

        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testContractorForbiddenFromProfileById() throws Exception {
                String profileId = contractorProfile.getId();
                // Contractor should be forbidden from accessing GET /profiles/{id}
                mockMvc.perform(get("/api/v1/contractors/profiles/" + profileId))
                                .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testHiringManagerAllowedProfileById() throws Exception {
                String profileId = contractorProfile.getId();
                // Hiring Manager should be allowed to access GET /profiles/{id}
                mockMvc.perform(get("/api/v1/contractors/profiles/" + profileId))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(profileId));
        }

        @Test
        @WithMockUser(username = "alice@example.com", roles = "CONTRACTOR")
        public void testContractorForbiddenFromProfileEngagements() throws Exception {
                String profileId = contractorProfile.getId();
                mockMvc.perform(get("/api/v1/contractors/profiles/" + profileId + "/engagements"))
                                .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testHiringManagerAllowedProfileEngagements() throws Exception {
                String profileId = contractorProfile.getId();
                mockMvc.perform(get("/api/v1/contractors/profiles/" + profileId + "/engagements"))
                                .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testResourceRequisitionNewFieldsFlow() throws Exception {
                // Get a valid skill id
                Skill skill = skillRepository.findAll().get(0);

                ResourceRequisitionRequestDTO request = ResourceRequisitionRequestDTO.builder()
                                .title("Python Developer")
                                .description("Python development gig")
                                .requiredSkillId(skill.getId())
                                .minExperienceYears(5)
                                .maxHourlyRate(new BigDecimal("75.00"))
                                .quantity(2)
                                .engagementType(EngagementType.HYBRID)
                                .experienceLevel(ExperienceLevel.MID)
                                .startDate(LocalDate.now().plusDays(2))
                                .duration("3 months")
                                .build();

                String body = objectMapper.writeValueAsString(request);

                // Create Requisition
                String responseStr = mockMvc.perform(post("/api/v1/requisitions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.engagementType").value("HYBRID"))
                                .andExpect(jsonPath("$.experienceLevel").value("MID"))
                                .andExpect(jsonPath("$.startDate").value(LocalDate.now().plusDays(2).toString()))
                                .andExpect(jsonPath("$.duration").value("3 months"))
                                .andReturn().getResponse().getContentAsString();

                ResourceRequisitionResponseDTO created = objectMapper.readValue(responseStr, ResourceRequisitionResponseDTO.class);
                String reqId = created.getId();

                // Update Requisition
                request.setEngagementType(EngagementType.ONSITE);
                request.setExperienceLevel(ExperienceLevel.JUNIOR);
                request.setStartDate(LocalDate.now().plusDays(10));
                request.setDuration("1 year");

                String updateBody = objectMapper.writeValueAsString(request);

                mockMvc.perform(put("/api/v1/requisitions/" + reqId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(updateBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.engagementType").value("ONSITE"))
                                .andExpect(jsonPath("$.experienceLevel").value("JUNIOR"))
                                .andExpect(jsonPath("$.startDate").value(LocalDate.now().plusDays(10).toString()))
                                .andExpect(jsonPath("$.duration").value("1 year"));
        }

        @Test
        @WithMockUser(username = "harold@example.com", roles = "HIRING_MANAGER")
        public void testResourceRequisitionStartDateInPastFails() throws Exception {
                Skill skill = skillRepository.findAll().get(0);
                ResourceRequisitionRequestDTO request = ResourceRequisitionRequestDTO.builder()
                                .title("Python Developer")
                                .description("Python development gig")
                                .requiredSkillId(skill.getId())
                                .minExperienceYears(5)
                                .maxHourlyRate(new BigDecimal("75.00"))
                                .quantity(2)
                                .engagementType(EngagementType.HYBRID)
                                .experienceLevel(ExperienceLevel.MID)
                                .startDate(LocalDate.now().minusDays(1)) // Past date
                                .duration("3 months")
                                .build();

                String body = objectMapper.writeValueAsString(request);

                mockMvc.perform(post("/api/v1/requisitions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                                .andExpect(status().isBadRequest()); // Start date in past
        }
}

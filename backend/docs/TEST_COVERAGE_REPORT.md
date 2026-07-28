# Test Coverage Audit Report

This report documents the audit of the integration test suite, JUnit coverage, security check coverage, workflow testing, and findings.

---

## 1. JUnit Integration Test Suite Details

The application contains 54 high-coverage integration tests implemented in the test class:
* **Test Class:** [GigForceApplicationTests.java](file:///c:/Users/HP/Downloads/gigforce_1/src/test/java/com/gigforce/GigForceApplicationTests.java)
* **Test Harness:** Spring Boot Test (`@SpringBootTest`), MockMvc (`@AutoConfigureMockMvc`), and transactional database rollback (`@Transactional`).
* **Profile:** Active profile `test` using an in-memory or temporary database schema.

---

## 2. Test Execution Mapping

The following matrix maps JUnit integration tests directly to user requirements and modules:

| Module | Test Method Name | Checked Rules |
| :--- | :--- | :--- |
| **4.1 IAM** | `testUserSuspensionState` | Suspend $\rightarrow$ deactivates account; blocks auth login |
| | `testOptimisticLockingOnUserUpdate` | Hibernate `@Version` check prevents concurrent user updates |
| **4.2 Profile**| `testContractorProfileCreationByManager` | Creates Contractor profile; restricts duplicate profiles |
| | `testOptimisticLockingOnContractorProfileStatus`| Prevents concurrency issues on profile status updates |
| | `testContractorCertificationIdPrefix` | Verifies prefix `cert` generated on new certification |
| | `testHiringManagerEngagementFlow` | HR creates engagement; checks `feedback`/`rating` defaults to `null` |
| | `testFeedbackOnOngoingEngagementFails` | Submitting feedback fails if engagement date is in future |
| | `testVendorManagerForbiddenFromEngagementActions` | Verifies VM cannot modify engagement records |
| | `testDeleteEngagementAccessControl` | Verifies delete engagement is restricted to HM/Admin only |
| | `testContractorForbiddenFromProfileById` | Verifies Contractor cannot view other profiles by ID |
| | `testHiringManagerAllowedProfileById` | Verifies Hiring Manager has access to profiles by ID |
| | `testContractorForbiddenFromProfileEngagements` | Blocks contractor from viewing profile engagements |
| | `testHiringManagerAllowedProfileEngagements`| Allows Hiring Manager to view engagements |
| **4.3 Sourcing**| `testResourceRequisitionNewFieldsFlow` | Validates engagementType, experienceLevel, dates, durations |
| | `testResourceRequisitionStartDateInPastFails` | Blocks requisition creation if start date is in the past |
| | `testSubmissionAcceptanceTransitionsContractorToAssigned`| Submission selection marks Contractor as `ON_ASSIGNMENT` |
| | `testDuplicateSubmissionPrevention` | Blocks submitting duplicate profiles to same requisition |
| | `testSubmissionCreationSetsSubmissionDate` | Verifies `submissionDate` is set automatically |
| | `testSubmissionFullStatusTransitionPipeline` | Submitted $\rightarrow$ Shortlisted $\rightarrow$ Interviewed $\rightarrow$ Selected |
| **4.4 Contract**| `testAssignmentCreationFromAcceptedSubmission`| Creating assignment locks rates, dates, and SOW references |
| | `testDuplicateAssignmentPreventionOnSameSubmission`| Blocks creating multiple assignments for same submission |
| | `testAmendmentAutoRejectionConflictingPending`| Rejects new amendment if one is already pending |
| | `testEarlyTerminationReleasesContractor` | Early termination marks contractor as `AVAILABLE` |
| **4.5 Timesheets**| `testTimesheetCreationDraft` | Verifies draft timesheet generation |
| | `testUpdateTimesheetDraft` | Verifies editing timesheet draft values |
| | `testSubmitTimesheet` | SUBMITTED status validation |
| | `testL1ApproveTimesheet` | L1 Hiring Manager approval $\rightarrow$ PENDING_FINANCE |
| | `testL2ApproveTimesheet` | L2 Finance approval $\rightarrow$ APPROVED |
| | `testRejectTimesheet` | Reject timesheet logs comments and transitions status |
| | `testAddCommentToTimesheet` | Comments thread validation |
| | `testFinanceApprovalBeforeHMApprovalBlocked` | Blocks L2 approval if L1 is pending |
| | `testContractorCannotEditApprovedTimesheet` | Blocks edits on approved timesheets |
| | `testCompletedAssignmentCannotAcceptTimesheet` | Blocks logging hours on completed assignments |
| | `testContractorViewsAnotherContractorsTimesheet`| Blocks horizontal access |
| | `testVendorAttemptsFinanceApproval` | Blocks unauthorized timesheet approvals |
| | `testGetPayrollReadyTimesheets` | Retrieves APPROVED + NOT_PROCESSED timesheets |
| | `testSweepPendingApprovals` | Sweeps pending approval logs |
| | `testDailyHoursLimitExceeded` | Blocks logging > 24 hours per day |
| | `testStandardDailyHoursCappingExceeded` | Blocks logging > 8 regular hours per day |
| | `testWeeklyRegularHoursCappingExceeded` | Blocks logging > 40 regular hours per week |
| | `testDuplicateWeeklyTimesheetBlocked` | Blocks duplicate weekly timesheets |
| | `testHoursLoggedDuringApprovedLeaveBlocked` | Blocks logging work hours on approved leave days |
| | `testHalfDayLeaveValidation` | Blocks logging > 4 hours on half-day leave days |
| | `testConcurrentDuplicateTimesheetSubmission` | Concurrency check on timesheet submission |
| **4.5 Leaves** | `testRequestLeave` | Submits leave request in PENDING state |
| | `testApproveLeave` | Approves leave request |
| | `testRejectLeave` | Rejects leave request and logs comments |
| | `testGetLeaveDetails` | Retrieves specific leave request details |
| | `testGetLeavesByProfile` | Lists absences for profile |
| | `testOverlappingLeaveRequestBlocked` | Blocks overlapping leave requests |
| | `testConcurrentLeaveApproval` | Concurrency check on leave approvals |

---

## 3. Findings & Recommendations

* **Gaps and Weaknesses:**
  1. **Missing Schema Integration Tests:** There are no tests verifying Swagger OpenAPI JSON docs generation or checking if DTOs have `@Schema` descriptions.
  2. **Missing Field Tests:** Because `OrgUnitID` (User) and `BusinessUnitID` (Requisition) are missing from the entities, there are no tests verifying their storage or filtering.
* **Recommendations:**
  * Implement integration tests that parse `/v3/api-docs` and verify DTO descriptions.
  * Add tests for `OrgUnitID` and `BusinessUnitID` once they are added in the remediation plan.

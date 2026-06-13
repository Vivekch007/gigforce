# Database Compliance Audit Report

This report documents the compliance audit of all database schemas, tables, fields, data types, indexes, and constraints implemented in the GigForce platform against Modules 4.1 to 4.5.

---

## 1. Table Verification and Schema Mapping

The database schema is mapped from Spring Boot JPA entities. The following tables physically exist in the MySQL database:

| Required Entity | Physical MySQL Table | Schema Status |
| :--- | :--- | :--- |
| **User** | `users` | **Exist with gaps** |
| **AuditLog** | `audit_logs` | **Exist** |
| **ContractorProfile** | `contractor_profiles` | **Exist with gaps** |
| **ContractorCertification** | `contractor_certifications` | **Exist** |
| **EngagementHistory** | `engagement_histories` | **Exist** |
| **ResourceRequisition** | `resource_requisitions` | **Exist with gaps** |
| **VendorSubmission** | `vendor_submissions` | **Exist** |
| **Assignment** | `assignments` | **Exist** |
| **AssignmentAmendment** | `assignment_amendments` | **Exist** |
| **Timesheet** | `timesheets` | **Exist** |
| **TimesheetLine** | `timesheet_lines` | **Exist with gaps** |
| **ContractorAbsence** | `contractor_absences` | **Exist** |

---

## 2. Detailed Field Audit & Gaps

### Module 4.1 – Identity & Access Management

#### User Table (`users`)
* **Entity Class:** [User.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/User.java)
* **Fields Audited:**
  * `UserID` $\rightarrow$ `user_id` varchar(64) - Primary Key (Compliant)
  * `Name` $\rightarrow$ `name` varchar(100) - NOT NULL (Compliant)
  * `Role` $\rightarrow$ `role` varchar(30) - NOT NULL (Compliant, Enum: `ADMIN`, `CONTRACTOR`, `HIRING_MANAGER`, `VENDOR`, `VENDOR_MANAGER`, `FINANCE`)
  * `Email` $\rightarrow$ `email` varchar(255) - NOT NULL UNIQUE (Compliant)
  * `Phone` $\rightarrow$ `phone` varchar(20) - NULL (Compliant)
  * `OrgUnitID` $\rightarrow$ **MISSING** (No column exists in table)
  * `Status` $\rightarrow$ `status` varchar(20) - NOT NULL (Compliant, Enum: `ACTIVE`, `INACTIVE`, `SUSPENDED`)
  * **Extra Fields:** `password` varchar(255) NOT NULL (Required for authentication)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `user_id`
  * Indexes: `idx_user_email` on `email`, `idx_user_role` on `role`, `idx_user_status` on `status`
  * Unique Constraints: `uk_user_email` on `email`

#### AuditLog Table (`audit_logs`)
* **Entity Class:** [AuditLog.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/audit/entity/AuditLog.java)
* **Fields Audited:**
  * `AuditID` $\rightarrow$ `audit_id` varchar(64) - Primary Key (Compliant)
  * `UserID` $\rightarrow$ `user_id` varchar(255) - NULL (Compliant)
  * `Action` $\rightarrow$ `action` varchar(100) - NOT NULL (Compliant)
  * `EntityType` $\rightarrow$ `entity_type` varchar(50) - NOT NULL (Compliant)
  * `Timestamp` $\rightarrow$ `timestamp` datetime(6) - NOT NULL (Compliant)
  * **Extra Fields:** `entity_id` varchar(255) (ID of the affected entity), `description` varchar(500)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `audit_id`
  * Indexes: `idx_audit_user_id` on `user_id`, `idx_audit_timestamp` on `timestamp`

---

### Module 4.2 – Contractor Profile & Skill Management

#### ContractorProfile Table (`contractor_profiles`)
* **Entity Class:** [ContractorProfile.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/ContractorProfile.java)
* **Fields Audited:**
  * `ContractorID` $\rightarrow$ `contractor_profile_id` varchar(64) - Primary Key (Compliant)
  * `UserID` $\rightarrow$ `user_id` varchar(64) - NOT NULL UNIQUE FK referencing `users.user_id` (Compliant)
  * `DisplayName` $\rightarrow$ **MISSING** (Omitted; DisplayName resolved at runtime from linked `users` table)
  * `PrimarySkill` $\rightarrow$ **MISSING** (Skills are normalized into child table `contractor_skills` instead of a flat column)
  * `SkillTags` $\rightarrow$ **MISSING** (Omitted)
  * `ExperienceYears` $\rightarrow$ `experience_years` int - NOT NULL (Compliant)
  * `PreferredEngagementType` $\rightarrow$ **MISSING** (Omitted on profile level)
  * `AvailabilityStatus` $\rightarrow$ `availability_status` varchar(30) - NOT NULL (Enum: `AVAILABLE`, `ON_ASSIGNMENT`, `ON_STATUS`)
    * *Gap:* Uses `ON_STATUS` in the enum mapping instead of `OnNotice`
  * `Status` $\rightarrow$ `profile_status` varchar(30) - NOT NULL (Enum: `ACTIVE`, `INACTIVE`, `BLACKLISTED`)
  * **Extra Fields:** `hourly_rate` decimal(10,2) NOT NULL
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `contractor_profile_id`
  * Foreign Keys: FK referencing `users` on `user_id`
  * Indexes: `idx_contractor_user_id` on `user_id`, `idx_contractor_status` on `profile_status`
  * Unique Constraints: `uk_contractor_user_id` on `user_id`

#### ContractorCertification Table (`contractor_certifications`)
* **Entity Class:** [ContractorCertification.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/ContractorCertification.java)
* **Fields Audited:**
  * `CertID` $\rightarrow$ `certification_id` varchar(64) - Primary Key (Compliant)
  * `ContractorID` $\rightarrow$ `contractor_profile_id` varchar(64) - NOT NULL FK referencing `contractor_profiles.contractor_profile_id` (Compliant)
  * `CertificationName` $\rightarrow$ `name` varchar(150) - NOT NULL (Compliant)
  * `IssuingBody` $\rightarrow$ `issuing_authority` varchar(150) - NOT NULL (Compliant)
  * `IssuedDate` $\rightarrow$ `issue_date` date - NOT NULL (Compliant)
  * `ExpiryDate` $\rightarrow$ `expiry_date` date - NULL (Compliant)
  * `Status` $\rightarrow$ `cert_status` varchar(20) - NULL (Enum: `VALID`, `EXPIRED`, `REVOKED`) (Compliant)
  * **Extra Fields:** `certificate_number` varchar(100) (License number)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `certification_id`
  * Foreign Keys: FK referencing `contractor_profiles` on `contractor_profile_id`
  * Indexes: `idx_cert_profile_id` on `contractor_profile_id`

#### EngagementHistory Table (`engagement_histories`)
* **Entity Class:** [EngagementHistory.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/EngagementHistory.java)
* **Fields Audited:**
  * `HistoryID` $\rightarrow$ `engagement_history_id` varchar(64) - Primary Key (Compliant)
  * `ContractorID` $\rightarrow$ `contractor_profile_id` varchar(64) - NOT NULL FK referencing `contractor_profiles.contractor_profile_id` (Compliant)
  * `ClientName` $\rightarrow$ `client_name` varchar(150) - NOT NULL (Compliant)
  * `Role` $\rightarrow$ `role_title` varchar(150) - NOT NULL (Compliant)
  * `StartDate` $\rightarrow$ `start_date` date - NOT NULL (Compliant)
  * `EndDate` $\rightarrow$ `end_date` date - NULL (Compliant)
  * `PerformanceRating` $\rightarrow$ `rating` int - NULL (Compliant)
  * `FeedbackSummary` $\rightarrow$ `feedback` varchar(500) - NULL (Compliant)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `engagement_history_id`
  * Foreign Keys: FK referencing `contractor_profiles` on `contractor_profile_id`
  * Indexes: `idx_engagement_profile_id` on `contractor_profile_id`

---

### Module 4.3 – Resource Requisition & Vendor Sourcing

#### ResourceRequisition Table (`resource_requisitions`)
* **Entity Class:** [ResourceRequisition.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/entity/ResourceRequisition.java)
* **Fields Audited:**
  * `RequisitionID` $\rightarrow$ `resource_requisition_id` varchar(64) - Primary Key (Compliant)
  * `HiringManagerID` $\rightarrow$ `created_by_user_id` varchar(64) - NOT NULL FK referencing `users.user_id` (Compliant)
  * `BusinessUnitID` $\rightarrow$ **MISSING** (No column exists in table)
  * `SkillRequired` $\rightarrow$ `required_skill_id` varchar(64) - NOT NULL FK referencing `skills.skill_id` (Compliant)
  * `ExperienceLevel` $\rightarrow$ `experience_level` varchar(20) - NOT NULL (Enum: `JUNIOR`, `MID`, `SENIOR`) (Compliant)
  * `EngagementType` $\rightarrow$ `engagement_type` varchar(20) - NOT NULL (Enum: `REMOTE`, `ONSITE`, `HYBRID`) (Compliant)
  * `StartDate` $\rightarrow$ `start_date` date - NOT NULL (Compliant)
  * `Duration` $\rightarrow$ `duration` varchar(50) - NOT NULL (Compliant)
  * `MaxRate` $\rightarrow$ `max_hourly_rate` decimal(10,2) - NOT NULL (Compliant)
  * `Status` $\rightarrow$ `status` varchar(30) - NOT NULL (Enum: `DRAFT`, `OPEN`, `FILLED`, `CANCELLED`)
    * *Gap:* Enum lacks `IN_PROGRESS` (InProgress) status
  * **Extra Fields:** `title` varchar(150) NOT NULL, `description` text, `minExperienceYears` int, `quantity` int
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `resource_requisition_id`
  * Foreign Keys: FK referencing `users` on `created_by_user_id`, FK referencing `skills` on `required_skill_id`
  * Indexes: `idx_req_skill_id` on `required_skill_id`, `idx_req_status` on `status`, `idx_req_created_by` on `created_by_user_id`

#### VendorSubmission Table (`vendor_submissions`)
* **Entity Class:** [VendorSubmission.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/entity/VendorSubmission.java)
* **Fields Audited:**
  * `SubmissionID` $\rightarrow$ `vendor_submission_id` varchar(64) - Primary Key (Compliant)
  * `RequisitionID` $\rightarrow$ `resource_requisition_id` varchar(64) - NOT NULL FK referencing `resource_requisitions.resource_requisition_id` (Compliant)
  * `VendorID` $\rightarrow$ `submitted_by_user_id` varchar(64) - NOT NULL FK referencing `users.user_id` (Compliant)
  * `ContractorID` $\rightarrow$ `contractor_profile_id` varchar(64) - NOT NULL FK referencing `contractor_profiles.contractor_profile_id` (Compliant)
  * `ProposedRate` $\rightarrow$ `proposed_rate` decimal(10,2) - NOT NULL (Compliant)
  * `SubmissionDate` $\rightarrow$ `submission_date` date - NOT NULL (Compliant)
  * `Status` $\rightarrow$ `status` varchar(30) - NOT NULL (Enum: `SUBMITTED`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `SELECTED`, `REJECTED`) (Compliant)
  * **Extra Fields:** `remarks` varchar(255)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `vendor_submission_id`
  * Foreign Keys: FKs referencing `resource_requisitions`, `users`, and `contractor_profiles`
  * Indexes: `idx_sub_req_id` on `resource_requisition_id`, `idx_sub_profile_id` on `contractor_profile_id`, `idx_sub_status` on `status`
  * Unique Constraints: Composite unique index `uc_requisition_contractor` on `(resource_requisition_id, contractor_profile_id)`

---

### Module 4.4 – Assignment & Contract Management

#### Assignment Table (`assignments`)
* **Entity Class:** [Assignment.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/assignment/entity/Assignment.java)
* **Fields Audited:**
  * `AssignmentID` $\rightarrow$ `assignment_id` varchar(64) - Primary Key (Compliant)
  * `RequisitionID` $\rightarrow$ `resource_requisition_id` varchar(64) - NULL FK referencing `resource_requisitions.resource_requisition_id` (Compliant)
  * `ContractorID` $\rightarrow$ `contractor_profile_id` varchar(64) - NOT NULL FK referencing `contractor_profiles.contractor_profile_id` (Compliant)
  * `HiringManagerID` $\rightarrow$ `hiring_manager_user_id` varchar(64) - NOT NULL FK referencing `users.user_id` (Compliant)
  * `VendorID` $\rightarrow$ `vendor_user_id` varchar(64) - NULL FK referencing `users.user_id` (Compliant)
  * `StartDate` $\rightarrow$ `start_date` date - NOT NULL (Compliant)
  * `EndDate` $\rightarrow$ `end_date` date - NOT NULL (Compliant)
  * `AgreedRatePerDay` $\rightarrow$ `agreed_rate_per_day` decimal(10,2) - NOT NULL (Compliant)
  * `EngagementType` $\rightarrow$ `engagement_type` varchar(50) - NOT NULL (Compliant)
  * `SOWReference` $\rightarrow$ `sow_reference` varchar(150) - NULL (Compliant)
  * `Status` $\rightarrow$ `status` varchar(30) - NOT NULL (Enum: `ACTIVE`, `EXTENDED`, `COMPLETED`, `TERMINATED_EARLY`) (Compliant)
  * **Extra Fields:** `vendor_submission_id` varchar(64) UNIQUE (1:1 linking back to submission)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `assignment_id`
  * Foreign Keys: FKs referencing `resource_requisitions`, `contractor_profiles`, `users` (HiringManager), `users` (Vendor), and `vendor_submissions`
  * Indexes: `idx_assign_profile` on `contractor_profile_id`, `idx_assign_status` on `status`, `idx_assign_manager` on `hiring_manager_user_id`, `idx_assign_vendor` on `vendor_user_id`, `idx_assign_submission` on `vendor_submission_id`
  * Unique Constraints: `uk_assign_submission` on `vendor_submission_id`

#### AssignmentAmendment Table (`assignment_amendments`)
* **Entity Class:** [AssignmentAmendment.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/assignment/entity/AssignmentAmendment.java)
* **Fields Audited:**
  * `AmendmentID` $\rightarrow$ `assignment_amendment_id` varchar(64) - Primary Key (Compliant)
  * `AssignmentID` $\rightarrow$ `assignment_id` varchar(64) - NOT NULL FK referencing `assignments.assignment_id` (Compliant)
  * `AmendmentType` $\rightarrow$ `amendment_type` varchar(30) - NOT NULL (Enum: `EXTENSION`, `RATE_REVISION`, `SCOPE_CHANGE`, `EARLY_TERMINATION`) (Compliant)
  * `EffectiveDate` $\rightarrow$ `effective_date` date - NOT NULL (Compliant)
  * `NewValue` $\rightarrow$ `new_value` varchar(255) - NOT NULL (Compliant)
  * `ApprovedByID` $\rightarrow$ `approved_by_user_id` varchar(64) - NULL FK referencing `users.user_id` (Compliant)
  * `Status` $\rightarrow$ `status` varchar(30) - NOT NULL (Enum: `PENDING`, `APPROVED`, `REJECTED`) (Compliant)
  * **Extra Fields:** `remarks` varchar(255)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `assignment_amendment_id`
  * Foreign Keys: FK referencing `assignments` on `assignment_id`, FK referencing `users` on `approved_by_user_id`
  * Indexes: `idx_amend_assign_id` on `assignment_id`, `idx_amend_status` on `status`

---

### Module 4.5 – Timesheet & Leave Management

#### Timesheet Table (`timesheets`)
* **Entity Class:** [Timesheet.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/assignment/entity/Timesheet.java)
* **Fields Audited:**
  * `TimesheetID` $\rightarrow$ `timesheet_id` varchar(64) - Primary Key (Compliant)
  * `AssignmentID` $\rightarrow$ `assignment_id` varchar(64) - NOT NULL FK referencing `assignments.assignment_id` (Compliant)
  * `ContractorID` $\rightarrow$ `contractor_user_id` varchar(64) - NOT NULL FK referencing `users.user_id` (Compliant)
  * `WeekStartDate` $\rightarrow$ `week_start_date` date - NOT NULL (Compliant)
  * `WeekEndDate` $\rightarrow$ `week_end_date` date - NOT NULL (Compliant)
  * `HoursLogged` $\rightarrow$ `hours_logged` decimal(5,2) - NOT NULL (Compliant)
  * `OvertimeHours` $\rightarrow$ `overtime_logged` decimal(5,2) - NOT NULL (Compliant)
  * `SubmittedDate` $\rightarrow$ `submitted_date` datetime(6) - NULL (Compliant)
  * `Status` $\rightarrow$ `status` varchar(30) - NOT NULL (Enum: `DRAFT`, `SUBMITTED`, `PENDING_FINANCE`, `APPROVED`, `REJECTED`, `REVISED`) (Compliant)
    * *Note:* `PENDING_FINANCE` is an extra status added beyond requirements.
  * **Extra Fields:** `payroll_status` varchar(30) (Enum: `NOT_PROCESSED`, `PROCESSED`), `billable_amount` decimal(10,2) NOT NULL, `approved_by_hiring_manager_id` varchar(64) FK, `approved_by_finance_id` varchar(64) FK, `approved_date` datetime, `payroll_processed_date` datetime
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `timesheet_id`
  * Foreign Keys: FK referencing `assignments`, FK referencing `users` (contractor), FKs referencing `users` (approvers)
  * Indexes: `idx_timesheet_status` on `status`, `idx_timesheet_assignment` on `assignment_id`, `idx_timesheet_contractor` on `contractor_user_id`, `idx_timesheet_week` on `week_start_date`, `idx_timesheet_payroll_status` on `payroll_status`
  * Unique Constraints: Composite unique index `uq_contractor_assignment_week` on `(contractor_user_id, assignment_id, week_start_date)`

#### TimesheetLine Table (`timesheet_lines`)
* **Entity Class:** [TimesheetLine.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/assignment/entity/TimesheetLine.java)
* **Fields Audited:**
  * `LineID` $\rightarrow$ `timesheet_line_id` varchar(64) - Primary Key (Compliant)
  * `TimesheetID` $\rightarrow$ `timesheet_id` varchar(64) - NOT NULL FK referencing `timesheets.timesheet_id` (Compliant)
  * `Date` $\rightarrow$ `work_date` date - NOT NULL (Compliant)
  * `HoursWorked` $\rightarrow$ `hours_worked` decimal(4,2) - NOT NULL (Compliant)
  * `ActivityDescription` $\rightarrow$ `activity_desc` varchar(255) - NOT NULL (Compliant)
  * `Status` $\rightarrow$ **MISSING** (No line-level status column is present; status is managed at the parent Timesheet level)
  * **Extra Fields:** `overtime_hours` decimal(4,2) NOT NULL, `absence_id` varchar(64) FK referencing `contractor_absences`
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `timesheet_line_id`
  * Foreign Keys: FK referencing `timesheets`, FK referencing `contractor_absences`
  * Indexes: `idx_line_date` on `work_date`
  * Unique Constraints: Composite unique index `uq_timesheet_work_date` on `(timesheet_id, work_date)`

#### ContractorAbsence Table (`contractor_absences`)
* **Entity Class:** [ContractorAbsence.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/identity/entity/ContractorAbsence.java)
* **Fields Audited:**
  * `AbsenceID` $\rightarrow$ `absence_id` varchar(64) - Primary Key (Compliant)
  * `ContractorID` $\rightarrow$ `contractor_profile_id` varchar(64) - NOT NULL FK referencing `contractor_profiles` (Compliant)
  * `AssignmentID` $\rightarrow$ `assignment_id` varchar(64) - NOT NULL FK referencing `assignments` (Compliant)
  * `StartDate` $\rightarrow$ `start_date` date - NOT NULL (Compliant)
  * `EndDate` $\rightarrow$ `end_date` date - NOT NULL (Compliant)
  * `Reason` $\rightarrow$ `reason` varchar(500) - NOT NULL (Compliant)
  * `ApprovedByID` $\rightarrow$ `approved_by_id` varchar(64) - NULL FK referencing `users.user_id` (Compliant)
  * `Status` $\rightarrow$ `status` varchar(30) - NOT NULL (Enum: `PENDING`, `APPROVED`, `REJECTED`) (Compliant)
  * **Extra Fields:** `absence_type` varchar(30) (Sick leave, personal leave, etc.), `duration` varchar(20) (Full day, half day), `approved_date` datetime, `rejection_remarks` varchar(255)
* **Constraints & Indexes:**
  * Primary Key: `PRIMARY` on `absence_id`
  * Foreign Keys: FK referencing `contractor_profiles` on `contractor_profile_id`, FK referencing `assignments` on `assignment_id`, FK referencing `users` on `approved_by_id`
  * Indexes: `idx_absence_contractor` on `contractor_profile_id`, `idx_absence_assignment` on `assignment_id`, `idx_absence_status` on `status`, `idx_absence_dates` on `(start_date, end_date)`
  * Check Constraints: Database check constraint `start_date <= end_date` verified

---

## 3. Database Compliance Summary (Gaps and Findings)

* **Missing Tables:** None. All entities are mapped to MySQL tables.
* **Missing Columns:**
  1. `users` table: missing `org_unit_id`.
  2. `contractor_profiles` table: missing `display_name`, `primary_skill`, `skill_tags`, and `preferred_engagement_type`.
  3. `resource_requisitions` table: missing `business_unit_id`.
  4. `timesheet_lines` table: missing `status`.
* **Wrong Column Names:**
  1. `contractor_certifications` table uses `issuing_authority` instead of `issuing_body`.
  2. `engagement_histories` table uses `role_title` instead of `role`.
  3. `resource_requisitions` table uses `max_hourly_rate` instead of `max_rate`, and `created_by_user_id` instead of `hiring_manager_id`.
* **Wrong Datatypes:** None. Data types are appropriate (e.g. `varchar(64)` for IDs, `decimal(10,2)` for financial figures, `date`/`datetime` for temporal data, and `int` for years).
* **Missing Constraints:** None. All expected Foreign Keys, Primary Keys, Unique keys, and Check constraints are physically present.
* **Missing Indexes:** None. The tables contain appropriate indexes on search filters, foreign keys, and statuses.

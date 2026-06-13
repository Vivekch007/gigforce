# Entity Relationship Audit Report

This report documents the audit of entity relationships, cardinality mappings, cascade rules, orphan prevention, and foreign key integrity of the GigForce implementation.

---

## 1. Cardinality and Mapping Verification

The physical database enforces the following relationships:

| Relation | Mapping Type | Java Mapping | Database FK Column | Unique Constraint? |
| :--- | :--- | :--- | :--- | :--- |
| **User $\leftrightarrow$ ContractorProfile** | One-to-One | `@OneToOne(fetch = FetchType.LAZY)` | `user_id` | **Yes** (Unique Index) |
| **ContractorProfile $\rightarrow$ ContractorSkill** | One-to-Many | Managed via `@ManyToOne` on child | `contractor_profile_id` | No |
| **ContractorProfile $\rightarrow$ ContractorCertification** | One-to-Many | Managed via `@ManyToOne` on child | `contractor_profile_id` | No |
| **ContractorProfile $\rightarrow$ EngagementHistory** | One-to-Many | Managed via `@ManyToOne` on child | `contractor_profile_id` | No |
| **ResourceRequisition $\rightarrow$ VendorSubmission** | One-to-Many | Managed via `@ManyToOne` on child | `resource_requisition_id` | No |
| **ContractorProfile $\rightarrow$ VendorSubmission** | One-to-Many | Managed via `@ManyToOne` on child | `contractor_profile_id` | No |
| **VendorSubmission $\leftrightarrow$ Assignment** | One-to-One | `@OneToOne` in Assignment | `vendor_submission_id` | **Yes** (Unique Index) |
| **Assignment $\rightarrow$ AssignmentAmendment** | One-to-Many | Managed via `@ManyToOne` on child | `assignment_id` | No |
| **Assignment $\rightarrow$ Timesheet** | One-to-Many | Managed via `@ManyToOne` on child | `assignment_id` | No |
| **Timesheet $\rightarrow$ TimesheetLine** | One-to-Many | Managed via `@ManyToOne` on child | `timesheet_id` | No |
| **ContractorProfile $\rightarrow$ ContractorAbsence** | One-to-Many | Managed via `@ManyToOne` on child | `contractor_profile_id` | No |
| **Assignment $\rightarrow$ ContractorAbsence** | One-to-Many | Managed via `@ManyToOne` on child | `assignment_id` | No |

---

## 2. Integrity and Cascade Rules Audit

### Orphan Records Prevention
* **Enforced at Database Level:** Join columns are explicitly annotated with `optional = false` and `nullable = false` in child entities.
  * **Example:** `ContractorCertification` maps `contractorProfile` via `@JoinColumn(name = "contractor_profile_id", nullable = false)`. In MySQL, this translates to `NOT NULL` on the foreign key column, preventing orphan certification records.
  * Same applies to `ContractorSkill.contractorProfile`, `EngagementHistory.contractorProfile`, `TimesheetLine.timesheet`, and `ContractorAbsence.contractorProfile`.
* **Verdict:** **No orphan records** can be created for children where parent relationship is mandatory.

### Cascade Rules Audit
* **No Cascading in Entity Annotations:** The entities do not define `@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)` mappings. Instead, they rely on clean transactional business logic inside Service implementations to handle parent-child cascades.
* **Service-Layer Cascade Implementation:**
  * **Verification:** Deletions of profiles, certifications, or engagements must clear associated child records.
  * **Setup Cleanup in Tests:** Verified in [GigForceApplicationTests.java](file:///c:/Users/HP/Downloads/gigforce_1/src/test/java/com/gigforce/GigForceApplicationTests.java) that child tables (`timesheet_approvals`, `timesheet_comments`, and `timesheet_lines`) are purged before parent tables (`timesheets` and `assignments`) to avoid SQL Foreign Key constraint failures during mock data rebuilds.

### Foreign Key Integrity
* **MySQL Engine:** All tables use the `InnoDB` storage engine, which natively supports and enforces Foreign Key constraints.
* **Integrity Violations:** Database prevents deleting parents (e.g. `User`) if child records exist (e.g. `ContractorProfile`), throwing an `ObjectOptimisticLockingFailureException` or `DataIntegrityViolationException`.

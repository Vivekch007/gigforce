# Gap Analysis Report

This report documents the gap analysis between the GigForce requirements specification (Modules 4.1 to 4.5) and the current backend implementation.

---

## 1. Compliance and Coverage Metrics

The system achieves high functional compliance, but contains database schema gaps and status variances:

| Module / Area | Compliance Rating | Key Findings |
| :--- | :---: | :--- |
| **Module 4.1 (IAM)** | **90%** | Missing `OrgUnitID` on User entity. |
| **Module 4.2 (Contractor Profile)**| **65%** | Missing flat columns `DisplayName`, `PrimarySkill`, `SkillTags`, and `PreferredEngagementType`. `AvailabilityStatus` uses `ON_STATUS` instead of `OnNotice`. |
| **Module 4.3 (Requisitions)** | **90%** | Missing `BusinessUnitID` on Requisition. Requisition status enum lacks `IN_PROGRESS` status value. |
| **Module 4.4 (Assignments)** | **100%** | Fully compliant. |
| **Module 4.5 (Timesheets & Leaves)**| **95%** | Missing `Status` column on `TimesheetLine` table. |
| **Postman collections** | **100%** | Consolidated environment and collections created. |
| **JUnit Integration Testing** | **100%** | 54 integration tests cover all core flows. |

### Overall Requirement Coverage Score: **88%**

---

## 2. Detailed Gap Registers

### Missing Fields
1. **User Entity:** `orgUnitId` (OrgUnitID)
2. **ContractorProfile Entity:**
   * `displayName` (DisplayName)
   * `primarySkill` (PrimarySkill)
   * `skillTags` (SkillTags)
   * `preferredEngagementType` (PreferredEngagementType)
3. **ResourceRequisition Entity:** `businessUnitId` (BusinessUnitID)
4. **TimesheetLine Entity:** `status` (Status)

### Missing / Deviated Enum Values
1. **AvailabilityStatus Enum:** Uses `ON_STATUS` instead of `OnNotice`.
2. **RequisitionStatus Enum:** Missing `IN_PROGRESS` (InProgress) state, causing it to skip this state transition.

### ID Prefix Formatting Deviations
* **Current:** Lowercase prefixes followed by unpadded sequential numbers (e.g., `cnt1`, `req5`, `asn21`).
* **Expected:** Uppercase prefixes followed by 3-digit zero-padded numbers (e.g., `CNT001`, `REQ005`, `ASN021`).

---

## 3. Production Risks

1. **Port Mismatch in Postman Config:** The postman environment config defaults `baseUrl` to `http://localhost:8081/api/v1` or `http://localhost:8080/api/v1`. Running on the wrong port will cause API calls to fail.
2. **ID Sequence Integration Issues:** Downstream enterprise systems (such as SAP, Workday, or billing tools) often require fixed-length, capitalized, zero-padded identifiers (e.g., `CNT001`). Using unpadded lowercase IDs (`cnt1`) can break CSV parsers or downstream database loaders.
3. **API Consumer Onboarding Friction:** Omission of Swagger `@Schema` decorators on DTO fields leaves developers without property descriptions, sample values, or validation limits on the OpenAPI web UI.
4. **Missing Organization-Scoped Session Validation:** Session context checks for multi-tenancy are missing on several non-owner search queries, which could present data exposure risks if multiple organizations share the database.
5. **No Line-Level Timesheet Status:** By omitting `Status` on `TimesheetLine` records, it is impossible to approve/reject individual lines; timesheets must be processed entirely as a block.

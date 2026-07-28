# Role-Based Access Control (RBAC) Matrix

This report documents the permissions, access rights, ownership checks, and security controls enforced on each endpoint in the GigForce platform.

---

## 1. Role Permissions Matrix

The table below lists all endpoints and maps access rights for each of the six enterprise roles:
* **ADM:** Admin
* **CNT:** Contractor
* **HM:** Hiring Manager
* **VEN:** Vendor
* **VM:** Vendor Manager
* **FIN:** Finance

| Route | ADM | CNT | HM | VEN | VM | FIN | Ownership Validation Check |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `POST /auth/register` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Public endpoint |
| `POST /auth/login` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Public endpoint |
| `GET /users` | **YES** | NO | **YES** | NO | NO | NO | None (Administrative listing) |
| `GET /users/{id}` | **YES** | **Self** | **Self** | **Self** | **Self** | **Self** | Verifies caller email matches target email |
| `PUT /users/{id}` | **YES** | **Self** | **Self** | **Self** | **Self** | **Self** | Verifies caller email matches target email |
| `PUT /users/{id}/suspend`| **YES** | NO | NO | NO | NO | NO | Admin-only |
| `PUT /users/{id}/deactivate`| **YES** | NO | NO | NO | NO | NO | Admin-only |
| `PUT /users/{id}/activate` | **YES** | NO | NO | NO | NO | NO | Admin-only |
| `GET /audit/**` | **YES** | NO | NO | NO | NO | NO | Admin-only |
| `POST /contractors/profiles`| **YES** | NO | **YES** | NO | NO | NO | None |
| `GET /contractors/profiles/{id}`| **YES** | NO | **YES** | **YES** | **YES** | **YES** | Explicitly blocks Contractor role |
| `GET /contractors/profiles/me`| NO | **YES** | NO | NO | NO | NO | Fetches profile of caller user ID |
| `PUT /contractors/profiles/{id}`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `GET /contractors/profiles`| **YES** | NO | **YES** | **YES** | **YES** | **YES** | Explicitly blocks Contractor role |
| `POST /profiles/{id}/skills`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `PUT /.../skills/{skillId}`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `DELETE /.../skills/{skillId}`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `POST /.../certifications`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `GET /.../certifications`| **YES** | **Self** | **YES** | **YES** | **YES** | **YES** | Blocked for non-owner Contractors |
| `PUT /.../certifications/{cId}`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `DELETE /.../certifications/{cId}`| **YES** | **Self** | **Self** | NO | NO | NO | Checks if `profile.userId` matches caller |
| `POST /.../engagements` | **YES** | NO | **YES** | NO | NO | NO | None (HR/Admin registered) |
| `GET /.../engagements` | **YES** | NO | **YES** | **YES** | **YES** | **YES** | Explicitly blocks Contractor role |
| `PUT /.../engagements/{eId}`| **YES** | NO | **YES** | NO | NO | NO | None (HR/Admin updated) |
| `PUT /.../feedback` | **YES** | NO | **YES** | NO | NO | NO | None (Hiring Manager submits review) |
| `DELETE /.../engagements/{eId}`| **YES** | NO | **YES** | NO | NO | NO | Admin and HR Manager only |
| `POST /requisitions` | **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `PUT /requisitions/{id}` | **YES** | NO | **YES** | NO | NO | NO | Checks if caller is requisition creator |
| `PUT /requisitions/{id}/publish`| **YES** | NO | **YES** | NO | NO | NO | Checks if caller is requisition creator |
| `PUT /requisitions/{id}/cancel`| **YES** | NO | **YES** | NO | NO | NO | Checks if caller is requisition creator |
| `GET /requisitions/{id}` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Authenticated users |
| `GET /requisitions` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Authenticated users |
| `POST /submissions/.../submit`| **YES** | **YES** | NO | **YES** | **YES** | NO | Checks if submitter owns Vendor account |
| `GET /submissions/requisitions/{rId}`| **YES** | **YES** | **YES** | **YES** | **YES** | NO | Checks if caller matches submitting Vendor |
| `GET /submissions/{id}` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Authenticated users |
| `PUT /submissions/{id}/shortlist`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `PUT /submissions/{id}/schedule-interview`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `PUT /submissions/{id}/select`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `PUT /submissions/{id}/reject`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `GET /submissions` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Authenticated users |
| `POST /assignments` | **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `GET /assignments/{id}` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Blocked for non-related Vendors/Contractors |
| `GET /assignments` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Blocked for non-related Vendors/Contractors |
| `POST /.../amendments` | **YES** | NO | **YES** | **YES** | **YES** | NO | Checks if vendor/manager owns assignment |
| `PUT /amendments/{id}/approve`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `PUT /amendments/{id}/reject`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `GET /.../amendments` | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | Authenticated users |
| `POST /timesheets` | **YES** | **Owner**| NO | NO | NO | NO | Checks if caller matches contractor on assignment |
| `PUT /timesheets/{id}` | **YES** | **Owner**| NO | NO | NO | NO | Checks if caller is contractor owner |
| `POST /timesheets/{id}/submit`| **YES** | **Owner**| NO | NO | NO | NO | Checks if caller is contractor owner |
| `POST /timesheets/{id}/approve`| **YES** | NO | **L1 HM**| NO | NO | **L2 FIN**| Context-based L1 / L2 validation checks |
| `POST /timesheets/{id}/reject`| **YES** | NO | **L1 HM**| NO | NO | **L2 FIN**| Context-based L1 / L2 validation checks |
| `POST /timesheets/{id}/comments`| **YES** | **Owner**| **HM** | **Vendor**| **VM** | **Finance**| Verifies caller is related to Assignment |
| `GET /timesheets/{id}` | **YES** | **Owner**| **HM** | **Vendor**| **VM** | **Finance**| Verifies caller is related to Assignment |
| `GET /timesheets` | **YES** | **Owner**| **HM** | **Vendor**| **VM** | **Finance**| Filters by user association |
| `GET /timesheets/payroll-ready`| **YES** | NO | NO | NO | NO | **YES** | Admin and Finance only |
| `POST /absences` | **YES** | **Owner**| NO | NO | NO | NO | Checks if caller matches contractor on assignment |
| `GET /absences/{id}` | **YES** | **Owner**| **HM** | **Vendor**| **VM** | **Finance**| Verifies caller is related to Assignment |
| `POST /absences/{id}/approve`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `POST /absences/{id}/reject`| **YES** | NO | **YES** | NO | NO | NO | HM/Admin only |
| `GET /absences` | **YES** | **Owner**| **HM** | **Vendor**| **VM** | **Finance**| Filters by user association |

---

## 2. Security Controls & Privilege Auditing

### IDOR (Insecure Direct Object Reference) Protection
* The application implements IDOR checks in service logic rather than relying on URL patterns:
  * **Timesheet access:** `TimesheetServiceImpl.java` checks if `currentUserContext.getCurrentUserId()` matches the `contractor_user_id` on the timesheet for all edits/views by a contractor.
  * **Leave/Absence access:** `ContractorAbsenceServiceImpl.java` checks if `currentUserContext.getCurrentUserId()` matches the contractor profile owner.
  * **Profile access:** `ContractorProfileServiceImpl.java` restricts `/profiles/{id}` updates and deletions using custom context validations.

### Privilege Escalation Risks
* **Vertical Privilege Escalation:** Blocked by Spring Security `@PreAuthorize("hasRole('ADMIN')")` or `@PreAuthorize("hasAnyRole('ADMIN', 'HIRING_MANAGER')")` method checks. A contractor attempting to approve their own leave or timesheet receives a `403 Forbidden` error.
* **Horizontal Privilege Escalation:** Mitigated by ownership validation. For example, a contractor calling `GET /api/v1/timesheets/{otherTimesheetId}` is blocked because the service verifies their user ID matches the contractor ID on that specific record.

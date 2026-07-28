# API Coverage and Audit Report

This report documents the verification of all REST APIs, CRUD capabilities, pagination, filtering parameters, and state transition endpoints across the GigForce modules.

---

## 1. Complete REST API Matrix

The platform exposes endpoints via the following Spring Boot REST controllers:

| Entity | Endpoint Route | HTTP Method | Auth Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| **Auth** | `/api/v1/auth/register` | `POST` | Public | Register a new user |
| | `/api/v1/auth/login` | `POST` | Public | Authenticate user and get JWT |
| **User** | `/api/v1/users` | `GET` | Admin, HiringManager | Search and list users (Paginated) |
| | `/api/v1/users/me` | `GET` | Authenticated | Get current authenticated user |
| | `/api/v1/users/{id}` | `GET` | Admin / Owner | Get user details by ID |
| | `/api/v1/users/{id}` | `PUT` | Admin / Owner | Update user profile (Name, Phone) |
| | `/api/v1/users/{id}/suspend` | `PUT` | Admin | Transition user status to `SUSPENDED` |
| | `/api/v1/users/{id}/deactivate` | `PUT` | Admin | Transition user status to `INACTIVE` |
| | `/api/v1/users/{id}/activate` | `PUT` | Admin | Transition user status to `ACTIVE` |
| **ContractorProfile** | `/api/v1/contractors/profiles` | `POST` | Admin, HiringManager | Create profile for a contractor |
| | `/api/v1/contractors/profiles/me` | `GET` | Contractor | Get authenticated contractor profile |
| | `/api/v1/contractors/profiles/{id}` | `GET` | Non-Contractor roles | Get profile details by ID |
| | `/api/v1/contractors/profiles/{id}` | `PUT` | Admin / Owner | Update profile details and status |
| | `/api/v1/contractors/profiles` | `GET` | Non-Contractor roles | Search and list profiles (Paginated) |
| | `/api/v1/contractors/profiles/{id}/skills` | `POST` | Admin / Owner | Add skill mapping to profile |
| | `/api/v1/contractors/profiles/{id}/skills/{skillId}`| `PUT` | Admin / Owner | Update skill experience or proficiency |
| | `/api/v1/contractors/profiles/{id}/skills/{skillId}`| `DELETE` | Admin / Owner | Remove skill mapping |
| | `/api/v1/contractors/profiles/{id}/certifications` | `POST` | Admin / Owner | Add certification to profile |
| | `/api/v1/contractors/profiles/{id}/certifications` | `GET` | Authenticated | List all certifications for a profile |
| | `/api/v1/contractors/profiles/{id}/certifications/{certId}`| `PUT` | Admin / Owner | Update certification details |
| | `/api/v1/contractors/profiles/{id}/certifications/{certId}`| `DELETE` | Admin / Owner | Remove certification |
| | `/api/v1/contractors/profiles/{id}/engagements` | `POST` | Admin, HiringManager | Add engagement history to profile |
| | `/api/v1/contractors/profiles/{id}/engagements` | `GET` | Non-Contractor roles | List engagement history |
| | `/api/v1/contractors/profiles/{id}/engagements/{engId}`| `PUT` | Admin, HiringManager | Update engagement history details |
| | `/api/v1/contractors/profiles/{id}/engagements/{engId}/feedback`| `PUT`| Admin, HiringManager | Submit performance rating/feedback |
| | `/api/v1/contractors/profiles/{id}/engagements/{engId}`| `DELETE`| Admin, HiringManager | Delete engagement history |
| **ResourceRequisition**| `/api/v1/requisitions` | `POST` | Admin, HiringManager | Create resource requisition |
| | `/api/v1/requisitions/{id}` | `PUT` | Admin, HiringManager | Update requisition (Draft only) |
| | `/api/v1/requisitions/{id}/publish` | `PUT` | Admin, HiringManager | Publish requisition (Draft -> Open) |
| | `/api/v1/requisitions/{id}/cancel` | `PUT` | Admin, HiringManager | Cancel requisition |
| | `/api/v1/requisitions/{id}` | `GET` | Authenticated | View requisition details by ID |
| | `/api/v1/requisitions` | `GET` | Authenticated | Search and list requisitions |
| **VendorSubmission** | `/api/v1/submissions/requisitions/{reqId}/submit` | `POST` | Admin, Vendor, Contractor | Submit contractor to requisition |
| | `/api/v1/submissions/requisitions/{reqId}` | `GET` | Non-Finance roles | Get submissions for requisition |
| | `/api/v1/submissions/{id}` | `GET` | Authenticated | Get submission details by ID |
| | `/api/v1/submissions/{id}/shortlist` | `PUT` | Admin, HiringManager | Transition submission $\rightarrow$ `SHORTLISTED` |
| | `/api/v1/submissions/{id}/schedule-interview` | `PUT`| Admin, HiringManager | Transition submission $\rightarrow$ `INTERVIEW_SCHEDULED` |
| | `/api/v1/submissions/{id}/select` | `PUT` | Admin, HiringManager | Transition submission $\rightarrow$ `SELECTED` |
| | `/api/v1/submissions/{id}/reject` | `PUT` | Admin, HiringManager | Transition submission $\rightarrow$ `REJECTED` |
| | `/api/v1/submissions` | `GET` | Authenticated | Search and list submissions (Paginated) |
| **Assignment** | `/api/v1/assignments` | `POST` | Admin, HiringManager | Create assignment |
| | `/api/v1/assignments/{id}` | `GET` | Non-Vendor roles | View assignment details by ID |
| | `/api/v1/assignments` | `GET` | Non-Vendor roles | Search and list assignments (Paginated) |
| **AssignmentAmendment**| `/api/v1/assignments/{assignId}/amendments`| `POST`| Admin, HM, Vendor | Request assignment amendment |
| | `/api/v1/amendments/{id}/approve` | `PUT` | Admin, HiringManager | Approve pending amendment |
| | `/api/v1/amendments/{id}/reject` | `PUT` | Admin, HiringManager | Reject pending amendment |
| | `/api/v1/assignments/{assignId}/amendments`| `GET` | Authenticated | List amendments for an assignment |
| **Timesheet** | `/api/v1/timesheets` | `POST` | Admin, Contractor | Create timesheet draft |
| | `/api/v1/timesheets/{id}` | `PUT` | Admin, Contractor | Update timesheet draft |
| | `/api/v1/timesheets/{id}/submit` | `POST` | Admin, Contractor | Submit timesheet for L1 review |
| | `/api/v1/timesheets/{id}/approve` | `POST` | Admin, HM, Finance | Approve timesheet (L1/L2 reviews) |
| | `/api/v1/timesheets/{id}/reject` | `POST` | Admin, HM, Finance | Reject timesheet |
| | `/api/v1/timesheets/{id}/comments` | `POST` | Authenticated | Add comment to timesheet thread |
| | `/api/v1/timesheets/{id}` | `GET` | Authenticated | View timesheet details by ID |
| | `/api/v1/timesheets` | `GET` | Authenticated | Search/list timesheets |
| | `/api/v1/timesheets/payroll-ready` | `GET` | Admin, Finance | Get approved timesheets for payroll |
| **ContractorAbsence** | `/api/v1/absences` | `POST` | Admin, Contractor | Request leave absence |
| | `/api/v1/absences/{id}` | `GET` | Authenticated | View leave details by ID |
| | `/api/v1/absences/{id}/approve` | `POST` | Admin, HiringManager | Approve leave request |
| | `/api/v1/absences/{id}/reject` | `POST` | Admin, HiringManager | Reject leave request |
| | `/api/v1/absences` | `GET` | Authenticated | Get leaves by contractor profile ID |
| **AuditLog** | `/api/v1/audit/user/{userId}` | `GET` | Admin | Get audit logs for user ID |
| | `/api/v1/audit/all` | `GET` | Admin | Get all audit logs |

---

## 2. Pagination & Search Auditing

* **Pagination Standard:** Implemented using Spring Data's `PageRequest` and `Page<T>` responses for the following lists:
  * Users: `GET /api/v1/users` (Request params: `page` and `size`, defaulting to 0 and 10).
  * Contractor Profiles: `GET /api/v1/contractors/profiles` (Request params: `page` and `size`, defaulting to 0 and 10).
  * Resource Requisitions: `GET /api/v1/requisitions` (Request params: `page` and `size`, defaulting to 0 and 10).
  * Vendor Submissions: `GET /api/v1/submissions` (Request params: `page` and `size`, defaulting to 0 and 10).
  * Assignments: `GET /api/v1/assignments` (Request params: `page` and `size`, defaulting to 0 and 10).
* **Filtering Parameters:**
  * Requisitions: Filters by `status`, `requiredSkillId`, and `maxRate`.
  * Vendor Submissions: Filters by `requisitionId`, `status`, and `contractorProfileId`.
  * Assignments: Filters by `status` and `contractorProfileId`.
  * Timesheets: Filters by `status`, `contractorUserId`, and `assignmentId` (returns list directly without page encapsulation).
  * Absences: Filters by `contractorProfileId` (returns list directly).

---

## 3. Findings and Audit Notes

* **Missing Endpoints:**
  * None. Full CRUD, Search, and Status actions are exposed for all entities.
* **Redundant Endpoints:**
  * `/api/v1/submissions/requisitions/{reqId}` lists submissions for a requisition. This is redundant since `GET /api/v1/submissions?requisitionId={reqId}` serves the same filtering capability.

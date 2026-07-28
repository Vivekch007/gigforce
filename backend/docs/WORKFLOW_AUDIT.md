# Business Workflow and State Transition Audit Report

This report documents the step-by-step lifecycles, state transitions, business rules, and roles responsible for each core workflow in the GigForce platform.

---

## 1. User Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : POST /register
    ACTIVE --> SUSPENDED : PUT /suspend (Admin)
    ACTIVE --> INACTIVE : PUT /deactivate (Admin)
    SUSPENDED --> ACTIVE : PUT /activate (Admin)
    INACTIVE --> ACTIVE : PUT /activate (Admin)
```

* **Role Responsible:** Admin (transitions), All Users (registration).
* **Business Rules:**
  * Suspension prevents authentication (`POST /auth/login` checks user status).
  * Deactivation blocks the user from active assignments and listings.

---

## 2. Contractor Profile Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : POST /profiles (HM/Admin)
    ACTIVE --> BLACKLISTED : PUT /profiles/{id} (Admin)
    ACTIVE --> INACTIVE : PUT /profiles/{id}
    BLACKLISTED --> ACTIVE : PUT /profiles/{id} (Admin)
    INACTIVE --> ACTIVE : PUT /profiles/{id}
```

* **Role Responsible:** Hiring Manager / Admin (creation), Contractor / Admin (updates).
* **Business Rules:**
  * Profile creation requires a pre-existing User in `ACTIVE` state with the `CONTRACTOR` role.
  * Mapped skills and certifications inherit access control (only owner or Admin can write).
  * Blacklisted contractors cannot be submitted to new requisitions or assigned.

---

## 3. Resource Requisition Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT : POST /requisitions (HM/Admin)
    DRAFT --> OPEN : PUT /publish (HM/Admin)
    DRAFT --> CANCELLED : PUT /cancel (HM/Admin)
    OPEN --> CANCELLED : PUT /cancel (HM/Admin)
    OPEN --> FILLED : Auto (Active Assignments >= Quantity)
```

* **Role Responsible:** Hiring Manager / Admin.
* **Business Rules:**
  * Requisitions can only be updated/edited while in `DRAFT` status.
  * Publishing transitions state from `DRAFT` $\rightarrow$ `OPEN`, making the requisition visible to Vendors.
  * Transitions to `FILLED` automatically once active assignments matching selected vendor submissions reach the requested quantity.

---

## 4. Vendor Submission Lifecycle

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED : POST /submit (Vendor/Contractor)
    SUBMITTED --> SHORTLISTED : PUT /shortlist (HM/Admin)
    SUBMITTED --> REJECTED : PUT /reject (HM/Admin)
    SHORTLISTED --> INTERVIEW_SCHEDULED : PUT /schedule-interview (HM/Admin)
    SHORTLISTED --> REJECTED : PUT /reject (HM/Admin)
    INTERVIEW_SCHEDULED --> SELECTED : PUT /select (HM/Admin)
    INTERVIEW_SCHEDULED --> REJECTED : PUT /reject (HM/Admin)
```

* **Role Responsible:** Vendor / Contractor (submission), Hiring Manager / Admin (review/selection).
* **Business Rules:**
  * Only open, active contractor profiles can be submitted to `OPEN` requisitions.
  * Submissions must have unique requisition-contractor pairings (enforced by DB composite unique constraint).
  * Transition to `SELECTED` enables assignment generation.

---

## 5. Assignment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : POST /assignments (HM/Admin)
    ACTIVE --> EXTENDED : Auto (Approved Extension Amendment)
    ACTIVE --> COMPLETED : Auto (End Date Reached)
    ACTIVE --> TERMINATED_EARLY : Auto (Approved Termination Amendment)
```

* **Role Responsible:** Hiring Manager / Admin.
* **Business Rules:**
  * Assignments are generated from a `SELECTED` vendor submission.
  * Creating an assignment updates the contractor availability: `AVAILABLE` $\rightarrow$ `ON_ASSIGNMENT`.
  * Amendments can extend the end date (`EXTENDED`) or cause early closure (`TERMINATED_EARLY`). On termination/completion, contractor status transitions back to `AVAILABLE`.

---

## 6. Assignment Amendment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /amendments (HM/Vendor)
    PENDING --> APPROVED : PUT /approve (HM/Admin)
    PENDING --> REJECTED : PUT /reject (HM/Admin)
```

* **Role Responsible:** Hiring Manager / Vendor (request), Hiring Manager / Admin (approval).
* **Business Rules:**
  * Only one pending amendment can exist for an assignment at a time.
  * Approving the amendment updates the underlying assignment rates, dates, or status automatically.

---

## 7. Timesheet Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT : POST /timesheets (Contractor)
    DRAFT --> SUBMITTED : POST /submit (Contractor)
    SUBMITTED --> PENDING_FINANCE : POST /approve (L1 HM)
    SUBMITTED --> REVISED : POST /reject (L1 HM)
    PENDING_FINANCE --> APPROVED : POST /approve (L2 Finance)
    PENDING_FINANCE --> REJECTED : POST /reject (L2 Finance)
    REVISED --> SUBMITTED : POST /submit (Contractor)
```

* **Role Responsible:** Contractor (draft, submit), Hiring Manager (L1 Review), Finance (L2 Audit/Payroll).
* **Business Rules:**
  * Weekly timesheets are logged Monday to Sunday. Only one timesheet can exist per contractor-assignment-week.
  * L1 approval checks: total daily hours $\le 8$ regular, $\le 24$ total; weekly hours $\le 40$ regular, $\le 60$ total.
  * L2 approval: verifies billing rate and updates status to `APPROVED`.
  * Payroll sweeps process `APPROVED` and `NOT_PROCESSED` timesheets.

---

## 8. Contractor Leave Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /absences (Contractor)
    PENDING --> APPROVED : POST /approve (HM/Admin)
    PENDING --> REJECTED : POST /reject (HM/Admin)
```

* **Role Responsible:** Contractor (request), Hiring Manager / Admin (review).
* **Business Rules:**
  * Cannot request leave for dates outside the active assignment range.
  * Overlapping leave requests for the same contractor are blocked.
  * Approving leave updates overlapping timesheet lines (forces 0 billable hours for full-day leaves, and restricts worked hours to $\le 4$ hours for half-day leaves).

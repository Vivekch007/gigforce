# GigForce Module 2 – Final Verification Checklist

This checklist is used to perform a complete verification of **Module 2: Contractor Profile & Skill Management (including ContractorCertification and EngagementHistory Extensions)** and generate a final PASS/FAIL report.

Module 2 is marked COMPLETE only if every item below passes.

---

# Section A - Application Startup

## A1
Application starts successfully.
* Expected:
  * Spring Boot compiles and starts without errors.
  * Tomcat starts on port 8080.
  * No `BeanCreationException` or Hibernate startup errors.
* Status:
  [ ] PASS
  [ ] FAIL

## A2
Database connection successful.
* Expected:
  * Local MySQL connection established.
  * Hibernate updates schemas.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section B - Database Schema Verification

Verify that all tables, indexes, and constraints exist in the database.

## B1
`contractor_profiles` Table
* Fields: `contractor_profile_id`, `user_id`, `title`, `bio`, `hourly_rate`, `experience_years`, `status`.
* Indexes: `idx_contractor_user_id` (on `user_id`), `idx_contractor_status` (on `status`).
* Status:
  [ ] PASS
  [ ] FAIL

## B2
`skills` Table
* Fields: `skill_id`, `name`, `category`, `description`.
* Constraints: Unique constraint on `name` (case-insensitive).
* Indexes: `idx_skill_name` (on `name`).
* Status:
  [ ] PASS
  [ ] FAIL

## B3
`contractor_skills` Table
* Fields: `contractor_skill_id`, `contractor_profile_id`, `skill_id`, `proficiency_level`, `years_of_experience`.
* Constraints: Unique constraint on `contractor_profile_id` + `skill_id`.
* Status:
  [ ] PASS
  [ ] FAIL

## B4
`contractor_certifications` Table
* Fields: `certification_id`, `contractor_profile_id`, `name`, `issuing_authority`, `certificate_number`, `issue_date`, `expiry_date`.
* Indexes: `idx_cert_profile_id` (on `contractor_profile_id`).
* Status:
  [ ] PASS
  [ ] FAIL

## B5
`engagement_histories` Table
* Fields: `engagement_history_id`, `contractor_profile_id`, `client_org_id`, `role_title`, `start_date`, `end_date`, `feedback`, `rating`.
* Indexes: `idx_engagement_profile_id` (on `contractor_profile_id`), `idx_engagement_client_org_id` (on `client_org_id`).
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section C - Skills Catalog Administration

Verify that the skills catalog is protected and functions correctly.

## C1
Admin Can Create Skills
* Method: `POST /api/v1/skills`
* Role: `ADMIN`
* Expected: Returns `201 Created` with the new skill's ID.
* Status:
  [ ] PASS
  [ ] FAIL

## C2
Contractor Cannot Create Skills
* Method: `POST /api/v1/skills`
* Role: `CONTRACTOR`
* Expected: Returns `403 Forbidden` JSON.
* Status:
  [ ] PASS
  [ ] FAIL

## C3
Duplicate Skill Name Blocked
* Expected: Registering a skill with a name that matches an existing one (case-insensitive) throws a `DuplicateSkillException` and returns `400 Bad Request`.
* Status:
  [ ] PASS
  [ ] FAIL

## C4
List Master Catalog Skills
* Method: `GET /api/v1/skills`
* Role: Any Authenticated User.
* Expected: Returns `200 OK` with list of seeded skills (e.g. Java, React).
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section D - Contractor Profile Lifecycle

Verify profile operations and self-service boundaries.

## D1
Contractor Profile Setup
* Method: `POST /api/v1/contractors/profiles`
* Role: `CONTRACTOR`
* Expected: Returns `201 Created` with profile mapping details. Status defaults to `ONBOARDING`.
* Status:
  [ ] PASS
  [ ] FAIL

## D2
Duplicate Profile Creation Blocked
* Expected: Attempting to create a second profile for the same user throws `DuplicateProfileException` and returns `400 Bad Request`.
* Status:
  [ ] PASS
  [ ] FAIL

## D3
Retrieve Own Profile details
* Method: `GET /api/v1/contractors/profiles/me`
* Role: `CONTRACTOR`
* Expected: Returns `200 OK` containing the caller's profile and mapped skills.
* Status:
  [ ] PASS
  [ ] FAIL

## D4
Update Own Profile
* Method: `PUT /api/v1/contractors/profiles/{id}`
* Role: Owner `CONTRACTOR`
* Expected: Returns `200 OK` with updated title, bio, hourly rate, and experience.
* Status:
  [ ] PASS
  [ ] FAIL

## D5
Cross Contractor Profile Modification Blocked
* Expected: Contractor B attempting to update Contractor A's profile ID via `PUT /api/v1/contractors/profiles/{id}` returns `403 Forbidden`.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section E - Contractor Skill Mapping

Verify the linking of profiles to skills with metadata.

## E1
Add Skill Mapping
* Method: `POST /api/v1/contractors/profiles/{id}/skills`
* Role: Owner `CONTRACTOR` or `ADMIN`.
* Expected: Returns `201 Created` with updated profile. Proficiency level stored matches enum.
* Status:
  [ ] PASS
  [ ] FAIL

## E2
Duplicate Skill Association Blocked
* Expected: Mapping the same skill twice to the same profile returns `400 Bad Request`.
* Status:
  [ ] PASS
  [ ] FAIL

## E3
Update Skill Proficiency/Experience
* Method: `PUT /api/v1/contractors/profiles/{id}/skills/{skillId}`
* Role: Owner or `ADMIN`.
* Expected: Returns `200 OK` with modified proficiency and years of experience.
* Status:
  [ ] PASS
  [ ] FAIL

## E4
Remove Skill Mapping
* Method: `DELETE /api/v1/contractors/profiles/{id}/skills/{skillId}`
* Role: Owner or `ADMIN`.
* Expected: Returns `204 No Content` on success.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section F - Certifications Setup

Verify credential certification management.

## F1
Add Certification
* Method: `POST /api/v1/contractors/profiles/{id}/certifications`
* Role: Owner or `ADMIN`.
* Expected: Returns `201 Created` with the registered certification.
* Status:
  [ ] PASS
  [ ] FAIL

## F2
Retrieve Certifications list
* Method: `GET /api/v1/contractors/profiles/{id}/certifications`
* Role: Authenticated (scoped).
* Expected: Returns `200 OK` with array of certifications.
* Status:
  [ ] PASS
  [ ] FAIL

## F3
Update Certification Details
* Method: `PUT /api/v1/contractors/profiles/{id}/certifications/{certId}`
* Role: Owner or `ADMIN`.
* Expected: Returns `200 OK` with updated details.
* Status:
  [ ] PASS
  [ ] FAIL

## F4
Delete Certification
* Method: `DELETE /api/v1/contractors/profiles/{id}/certifications/{certId}`
* Role: Owner or `ADMIN`.
* Expected: Returns `204 No Content`.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section G - Placements & Engagement History

Verify client organization placement logging.

## G1
Add Placement Engagement Record
* Method: `POST /api/v1/contractors/profiles/{id}/engagements`
* Role: `ADMIN` or `VENDOR_MANAGER` belonging to the contractor's organization unit.
* Expected: Returns `201 Created` with logged placement details.
* Status:
  [ ] PASS
  [ ] FAIL

## G2
Contractor Cannot Add Placements
* Expected: `CONTRACTOR` attempting to call the post engagement endpoint returns `403 Forbidden`.
* Status:
  [ ] PASS
  [ ] FAIL

## G3
Update Placement Feedback & Rating
* Method: `PUT /api/v1/contractors/profiles/{id}/engagements/{engagementId}`
* Role: `ADMIN` or `VENDOR_MANAGER` (scoped).
* Expected: Returns `200 OK`.
* Status:
  [ ] PASS
  [ ] FAIL

## G4
Remove Placement Record
* Method: `DELETE /api/v1/contractors/profiles/{id}/engagements/{engagementId}`
* Role: `ADMIN` Only.
* Expected: Returns `204 No Content` on success. Non-admins receive `403 Forbidden`.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section H - Tenant Isolation Scoping

Verify multi-tenancy and data isolation boundaries.

## H1
Hiring Manager Search Scoped by Tenant Org
* Expected: Non-admins from Org B performing `GET /api/v1/contractors/profiles` only see profiles from Org B. Contractor profiles from Org A are not returned.
* Status:
  [ ] PASS
  [ ] FAIL

## H2
Cross Tenant Profile Read Blocked
* Expected: Client/Vendor roles from Org B attempting to read a profile ID from Org A (`GET /api/v1/contractors/profiles/{id}`) receive `403 Forbidden`.
* Status:
  [ ] PASS
  [ ] FAIL

## H3
Cross Tenant Certifications Read Blocked
* Expected: Client/Vendor roles from Org B attempting to read certifications of a contractor from Org A (`GET /api/v1/contractors/profiles/{id}/certifications`) receive `403 Forbidden`.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section I - Audit Logging Integration

Verify audit trace coverage.

## I1
Profile Operations Logged
* Expected: Profile creations and updates write `CONTRACTOR_PROFILE_CREATED` and `CONTRACTOR_PROFILE_UPDATED` events to `audit_logs` table.
* Status:
  [ ] PASS
  [ ] FAIL

## I2
Skill Operations Logged
* Expected: Skill mappings write `CONTRACTOR_SKILL_ADDED`, `CONTRACTOR_SKILL_UPDATED`, and `CONTRACTOR_SKILL_REMOVED` events.
* Status:
  [ ] PASS
  [ ] FAIL

## I3
Certification & Engagement Operations Logged
* Expected: Certifications and placements write corresponding `CONTRACTOR_CERTIFICATION_*` and `CONTRACTOR_ENGAGEMENT_*` audit logs.
* Status:
  [ ] PASS
  [ ] FAIL

---

# Section J - Request Validation

Verify input constraints.

## J1
Hourly Rate Constraints
* Expected: Passing an hourly rate `<= 0` (e.g. `-5.00` or `0.00`) is rejected with `400 Bad Request` and structured validation message.
* Status:
  [ ] PASS
  [ ] FAIL

## J2
Experience Years Bounds
* Expected: Experience years `< 0` or invalid proficiency level strings are rejected with `400 Bad Request`.
* Status:
  [ ] PASS
  [ ] FAIL

## J3
Engagement Rating Bounds
* Expected: Logged ratings outside the `1-5` range are rejected with `400 Bad Request`.
* Status:
  [ ] PASS
  [ ] FAIL

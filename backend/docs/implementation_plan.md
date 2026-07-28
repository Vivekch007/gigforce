# Implementation Plan - Vendor Submission Enhancements

Implement changes to `VendorSubmission` to include a `submissionDate` field and update the `SubmissionStatus` enum values and transitions.

## Proposed Changes

### Enums

#### [MODIFY] [SubmissionStatus.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/enums/SubmissionStatus.java)
- Replace enum values with:
  ```java
  SUBMITTED,
  SHORTLISTED,
  INTERVIEW_SCHEDULED,
  SELECTED,
  REJECTED
  ```

### Entities

#### [MODIFY] [VendorSubmission.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/entity/VendorSubmission.java)
- Add the new field:
  - `@Column(name = "submission_date", nullable = false)` `private java.time.LocalDate submissionDate;`

### DTOs

#### [MODIFY] [VendorSubmissionResponseDTO.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/dto/VendorSubmissionResponseDTO.java)
- Add:
  - `private java.time.LocalDate submissionDate;`

### Service Layer

#### [MODIFY] [VendorSubmissionServiceImpl.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/service/VendorSubmissionServiceImpl.java)
- Update `submitContractor`: populate `.submissionDate(LocalDate.now())`.
- Update `transitionStatus`:
  - Check `SubmissionStatus.SELECTED` instead of `ACCEPTED`.
  - Check `SubmissionStatus.REJECTED`.
  - Add support for transitioning to `SHORTLISTED` and `INTERVIEW_SCHEDULED`.
  - Block transitions if the status is already `SELECTED` or `REJECTED`.
- Update `toDto`: map the new `submissionDate` field.

#### [MODIFY] [AssignmentServiceImpl.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/assignment/service/AssignmentServiceImpl.java)
- Update validation of submission status: check for `SubmissionStatus.SELECTED` instead of `SubmissionStatus.ACCEPTED` when creating a new assignment.

### Controller Layer

#### [MODIFY] [VendorSubmissionController.java](file:///c:/Users/HP/Downloads/gigforce_1/src/main/java/com/gigforce/requisition/controller/VendorSubmissionController.java)
- Rename `/accept` to `/select` (transitions to `SubmissionStatus.SELECTED`).
- Rename `/review` to `/shortlist` (transitions to `SubmissionStatus.SHORTLISTED`).
- Add `/schedule-interview` (transitions to `SubmissionStatus.INTERVIEW_SCHEDULED`).
- Keep `/reject` (transitions to `SubmissionStatus.REJECTED`).

### Verification Plan

#### Automated Tests
- Run `mvn test` to verify no regressions.
- Update existing tests in `GigForceApplicationTests.java`:
  - Set status to `SubmissionStatus.SELECTED` instead of `SubmissionStatus.ACCEPTED` for test setup/seeding.
  - Set `.submissionDate(LocalDate.now())` for seeded `VendorSubmission`.
- Add integration tests asserting:
  - Submission creation sets `submissionDate` automatically to today.
  - Submissions can transition correctly through the pipeline: `SUBMITTED` -> `SHORTLISTED` -> `INTERVIEW_SCHEDULED` -> `SELECTED`.
  - Requisition auto-fill rules trigger when enough submissions are `SELECTED`.

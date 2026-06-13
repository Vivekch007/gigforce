# Task Checklist - Overtime Calculation & Split Implementation

- [x] Refactor `TimesheetLineRequestDTO` to remove client-supplied `overtimeHours` input field.
- [x] Implement backend auto-splitting of daily worked hours into standard regular hours (capped at 8.00) and overtime hours in `TimesheetServiceImpl`.
- [x] Remove `.overtimeHours(...)` references from `TimesheetLineRequestDTO` builders in all `GigForceApplicationTests.java` methods.
- [x] Replace the daily hours capping test with `testStandardDailyHoursAutoSplitting` in `GigForceApplicationTests.java`.
- [x] Update E2E test script `run_verification.ps1` to remove client-supplied `overtimeHours` and send total worked hours.
- [x] Update Postman collections to align payloads and remove `overtimeHours`.
- [x] Drop and reset MySQL database `gigforce_db` to clear dirty state.
- [x] Run E2E verification runner (`run_verification.ps1`) to verify 100/100 test cases pass.
- [x] Run JUnit test suite (`mvn test`) to verify 53/53 tests pass.
- [x] Update `FINAL_COMPLIANCE_REPORT.md` to classify Overtime Calculation as FULLY IMPLEMENTED.
- [x] Update walkthrough and checklists.

package com.gigforce.assignment.service;

import com.gigforce.assignment.dto.*;
import com.gigforce.assignment.enums.TimesheetStatus;
import com.gigforce.assignment.enums.PayrollStatus;

import java.util.List;

public interface TimesheetService {
    TimesheetResponseDTO createTimesheet(TimesheetRequestDTO request);

    TimesheetResponseDTO updateTimesheet(String id, TimesheetRequestDTO request);

    TimesheetResponseDTO submitTimesheet(String id);

    TimesheetResponseDTO approveTimesheet(String id, TimesheetApprovalRequestDTO request);

    TimesheetResponseDTO rejectTimesheet(String id, TimesheetApprovalRequestDTO request);

    void addComment(String id, TimesheetCommentRequestDTO request);

    TimesheetResponseDTO getTimesheetById(String id);

    List<TimesheetResponseDTO> searchTimesheets(
            String timesheetId,
            String contractorProfileId,
            String assignmentId,
            TimesheetStatus status,
            java.time.LocalDate weekStartDate,
            java.time.LocalDate weekEndDate,
            String orgUnitId);

    List<TimesheetResponseDTO> getPayrollReadyTimesheets();

    void sweepPendingApprovals();
}

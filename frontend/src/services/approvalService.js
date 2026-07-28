import apiClient from './apiClient';

// --- Timesheet Approvals Endpoints ---

export function getTimesheetsToApprove(params) {
  // e.g. params: { status: 'SUBMITTED' }
  return apiClient.get('/timesheets', { params }).then((res) => res.data); // returns List<TimesheetResponseDTO>
}

export function getTimesheetDetails(id) {
  return apiClient.get(`/timesheets/${id}`).then((res) => res.data);
}

export function approveTimesheet(id, remarks) {
  // TimesheetApprovalRequestDTO { remarks }
  return apiClient.post(`/timesheets/${id}/approve`, { remarks }).then((res) => res.data);
}

export function rejectTimesheet(id, remarks) {
  // TimesheetApprovalRequestDTO { remarks }
  return apiClient.post(`/timesheets/${id}/reject`, { remarks }).then((res) => res.data);
}

// --- Leave Approvals Endpoints ---

export function getLeavesToApprove(params) {
  return apiClient.get('/absences', { params }).then((res) => res.data); // returns List<AbsenceResponseDTO>
}

export function getLeaveDetails(id) {
  return apiClient.get(`/absences/${id}`).then((res) => res.data);
}

export function approveLeave(id) {
  return apiClient.post(`/absences/${id}/approve`).then((res) => res.data);
}

export function rejectLeave(id, remarks) {
  // Note: ContractorAbsenceController.java maps remarks as a request param
  return apiClient.post(`/absences/${id}/reject`, null, { params: { remarks } }).then((res) => res.data);
}

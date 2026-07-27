import apiClient from './apiClient';

// --- Timesheet Management Endpoints (/api/v1/timesheets) ---

export function createTimesheet(payload) {
  // TimesheetCreateRequestDTO { assignmentId, weekStartDate }
  return apiClient.post('/timesheets', payload).then((res) => res.data);
}

export function updateTimesheet(id, payload) {
  // TimesheetUpdateRequestDTO { lines: [{ workDate, hoursWorked, activityDesc }] }
  return apiClient.put(`/timesheets/${id}`, payload).then((res) => res.data);
}

export function submitTimesheet(id) {
  return apiClient.post(`/timesheets/${id}/submit`).then((res) => res.data);
}

export function approveTimesheet(id, payload) {
  // TimesheetApprovalRequestDTO { remarks }
  return apiClient.post(`/timesheets/${id}/approve`, payload).then((res) => res.data);
}

export function rejectTimesheet(id, payload) {
  // TimesheetApprovalRequestDTO { remarks }
  return apiClient.post(`/timesheets/${id}/reject`, payload).then((res) => res.data);
}

export function addTimesheetComment(id, payload) {
  // TimesheetCommentRequestDTO { commentText }
  return apiClient.post(`/timesheets/${id}/comments`, payload).then((res) => res.data);
}

export function getTimesheetDetails(id) {
  return apiClient.get(`/timesheets/${id}`).then((res) => res.data);
}

export function getTimesheets(params) {
  return apiClient.get('/timesheets', { params }).then((res) => res.data); // returns Array
}

export function getPayrollReadyTimesheets() {
  return apiClient.get('/timesheets/payroll-ready').then((res) => res.data);
}

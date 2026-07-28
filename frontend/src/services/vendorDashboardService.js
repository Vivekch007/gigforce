import apiClient from './apiClient';
import { getRequisitions } from './vendorRequisitionService';
import { getSubmissions } from './submissionService';
import { getAssignments } from './vendorAssignmentService';
import { getTimesheets } from './vendorTimesheetService';
import { getPurchaseOrders } from './purchaseOrderService';
import { getInterviews } from './vendorInterviewService';
import { getMyNotifications } from './vendorNotificationService';

export async function getVendorDashboardMetrics() {
  const [reqs, subs, asns, ts, pos, ints, notifications, scorecard] = await Promise.all([
    getRequisitions({ status: 'OPEN' }).catch(() => ({ content: [] })),
    getSubmissions().catch(() => []),
    getAssignments().catch(() => []),
    getTimesheets().catch(() => []),
    getPurchaseOrders().catch(() => []),
    getInterviews().catch(() => []),
    getMyNotifications().catch(() => []),
    apiClient.get('/reports/vendor-scorecard/self').then((res) => res.data).catch(() => null),
  ]);

  const openReqsCount = reqs?.content?.length || 0;
  const totalSubmitted = subs.filter(s => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW').length;
  const totalShortlisted = subs.filter(s => s.status === 'SHORTLISTED' || s.status === 'INTERVIEW_SCHEDULED').length;
  const totalSelected = subs.filter(s => s.status === 'SELECTED').length;
  const activeAssignments = asns.filter(a => a.status === 'ACTIVE').length;
  // PurchaseOrderResponseDTO uses PascalCase keys and has no SUBMITTED/DRAFT status -
  // PENDING is the real "awaiting hiring-manager approval" state.
  const pendingPOs = pos.filter(p => p.Status === 'PENDING').length;
  const pendingTimesheets = ts.filter(t => t.status === 'SUBMITTED').length;

  // Build Recent Activity logs
  const recentActivities = notifications.slice(0, 5).map(n => ({
    id: n.NotificationID,
    title: n.Title || n.Category,
    desc: n.Message,
    time: n.CreatedDate,
  }));

  // Filter scheduled interviews
  const upcoming = ints.filter(i => i.status === 'SCHEDULED' || i.status === 'CONFIRMED').slice(0, 3);

  return {
    openReqs: openReqsCount,
    submittedCandidates: totalSubmitted,
    shortlistedCandidates: totalShortlisted,
    selectedCandidates: totalSelected,
    activeAssignments: scorecard ? scorecard.activeAssignments : activeAssignments,
    pendingPOs,
    pendingTimesheets,
    recentActivities,
    upcomingInterviews: upcoming,
    scorecard,
  };
}

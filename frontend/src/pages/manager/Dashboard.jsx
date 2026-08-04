import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getRequisitions } from '../../services/requisitionService';
import { searchSubmissions } from '../../services/vendorSubmissionService';
import { getAssignments } from '../../services/assignmentService';
import { getTimesheetsToApprove, getLeavesToApprove, getPayrollReadyTimesheets } from '../../services/approvalService';
import { getInterviews } from '../../services/interviewService';
import { getMyNotifications } from '../../services/notificationService';
import { getInvoices } from '../../services/invoiceCreationService';
import { getBusinessUnitDashboard } from '../../services/managerAnalyticsService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import KpiCard from '../../components/KpiCard';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({
    openJobs: 0,
    filledJobs: 0,
    fillRate: 0,
    totalSpend: 0,
    pendingSubmissions: 0,
    activeContractors: 0,
    pendingTimesheets: 0,
    pendingLeaves: 0,
    invoicesAwaiting: 0,
  });

  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [quickActionsList, setQuickActionsList] = useState([]);

  const [searchResults, setSearchResults] = useState({
    requisitions: [],
    contractors: [],
    vendors: [],
    candidates: [],
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

        const [
          reqsData,
          subsData,
          asnData,
          tsData,
          payrollReadyTsData,
          leavesData,
          interviewsData,
          notificationsData,
          buDashboard,
          invoicesData,
        ] = await Promise.all([
          getRequisitions({ size: 100 }).catch(() => ({ content: [] })),
          searchSubmissions({ size: 100 }).catch(() => ({ content: [] })),
          getAssignments({ size: 100 }).catch(() => ({ content: [] })),
          getTimesheetsToApprove().catch(() => []),
          getPayrollReadyTimesheets().catch(() => []),
          getLeavesToApprove().catch(() => []),
          getInterviews().catch(() => []),
          getMyNotifications().catch(() => []),
          getBusinessUnitDashboard(user?.orgUnitId || 'all').catch(() => null),
          getInvoices().catch(() => []),
        ]);

      const reqs = reqsData?.content || [];
      const subs = subsData?.content || [];
      const asns = asnData?.content || [];

       const openJobsCount = reqs.filter(r => r.status === 'OPEN').length;
       const pendingSubsCount = subs.filter(s => s.status === 'SUBMITTED').length;
       const activeContractorsCount = asns.filter(a => a.status === 'ACTIVE').length;
       const pendingTimesheetsCount = tsData.filter(t => t.status === 'SUBMITTED').length;
       const pendingLeavesCount = leavesData.filter(l => l.status === 'PENDING').length;

        // Build set of timesheet IDs that are already invoiced
        const billedIds = new Set();
        (invoicesData || []).forEach(inv => {
          const tsIds = inv.timesheetIds || inv.timesheet_ids;
          if (tsIds && Array.isArray(tsIds)) {
            tsIds.forEach(id => billedIds.add(id));
          }
        });

        // Count unbilled timesheets using exact logic from InvoiceCreation
        const unbilled = (payrollReadyTsData || []).filter(t => {
          const isUnbilled = !billedIds.has(t.id);
          const isApproved = t.status?.toUpperCase() === 'APPROVED';
          const isNotProcessed = (t.payroll_status || t.payrollStatus) === 'NOT_PROCESSED';
          const isNotCreated = !t.invoice_id;

          return isUnbilled && isApproved && isNotProcessed && isNotCreated;
        });
        const approvedUnbilledTimesheetsCount = unbilled.length;

      const openRequisitionsCount = buDashboard ? buDashboard.openRequisitions : openJobsCount;
      const filledRequisitionsCount = buDashboard ? buDashboard.filledRequisitions : reqs.filter(r => r.status === 'FILLED').length;
      const totalRequisitions = openRequisitionsCount + filledRequisitionsCount;
      const fillRateValue = totalRequisitions > 0 ? Math.round((filledRequisitionsCount / totalRequisitions) * 100) : 0;

      setStats({
        openJobs: openRequisitionsCount,
        filledJobs: filledRequisitionsCount,
        fillRate: fillRateValue,
        totalSpend: buDashboard ? buDashboard.totalSpend : 0,
        pendingSubmissions: pendingSubsCount,
        activeContractors: buDashboard ? buDashboard.activeContractors : activeContractorsCount,
        pendingTimesheets: pendingTimesheetsCount,
        pendingLeaves: pendingLeavesCount,
        invoicesAwaiting: approvedUnbilledTimesheetsCount,
      });

      setUpcomingInterviews(interviewsData.filter(i => i.status === 'SCHEDULED').slice(0, 3));

      // Filter out 'Timesheet Submitted' activity log entries (Keep all for scrollable list)
      const filteredNotifs = notificationsData.filter(act => {
        const titleText = (act.Title || '').toLowerCase();
        const msgText = (act.Message || '').toLowerCase();
        return !titleText.includes('timesheet submitted') && !msgText.includes('timesheet submitted');
      });
      setRecentActivities(filteredNotifs);

      // Assemble merged Quick Actions list
      const actions = [];

       if (pendingTimesheetsCount > 0) {
         actions.push({
           title: 'Review Pending Timesheets',
           desc: `${pendingTimesheetsCount} contractor time logs are awaiting review.`,
           path: '/manager/timesheet-approvals',
           priority: 'high'
         });
       }
       if (pendingLeavesCount > 0) {
         actions.push({
           title: 'Review Pending Leave Requests',
           desc: `${pendingLeavesCount} leave absence requests need approval.`,
           path: '/manager/leave-approvals',
           priority: 'high'
         });
       }

       // Always show Create Contractor Invoices with current count
       actions.push({
         title: 'Create Contractor Invoices',
         desc: approvedUnbilledTimesheetsCount > 0
           ? `${approvedUnbilledTimesheetsCount} approved timesheets ready for billing.`
           : 'No timesheets awaiting billing at this time.',
         path: '/manager/invoice-creation',
         priority: approvedUnbilledTimesheetsCount > 0 ? 'medium' : 'low'
       });

      // Default actions
      actions.push({
        title: 'Create Job Requisition',
        desc: 'Log talent demands & launch new roles',
        path: '/manager/create-requisition',
        priority: 'low'
      });
      actions.push({
        title: 'Review Vendor Submissions',
        desc: 'Evaluate vendor-proposed contractor profiles',
        path: '/manager/vendor-submissions',
        priority: 'low'
      });

      setQuickActionsList(actions);

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();

        const filteredReqs = reqs.filter(r =>
          r.id.toLowerCase().includes(query) ||
          r.jobTitle.toLowerCase().includes(query) ||
          (r.clientName && r.clientName.toLowerCase().includes(query)) ||
          r.status.toLowerCase().includes(query)
        );

        const filteredContractors = asns.filter(a =>
          (a.contractorName && a.contractorName.toLowerCase().includes(query)) ||
          a.id.toLowerCase().includes(query) ||
          (a.requisitionTitle && a.requisitionTitle.toLowerCase().includes(query))
        );

        const vendorMap = new Map();
        subs.forEach(s => {
          if (s.submittedByEmail) {
            const domain = s.submittedByEmail.split('@')[1] || '';
            const vendorName = domain.split('.')[0].toUpperCase() || 'Vendor Org';
            vendorMap.set(s.submittedById || 'unknown', {
              id: s.submittedById || 'vnd-1',
              name: vendorName,
              email: s.submittedByEmail,
            });
          }
        });
        const filteredVendors = Array.from(vendorMap.values()).filter(v =>
          v.name.toLowerCase().includes(query) ||
          v.email.toLowerCase().includes(query) ||
          v.id.toLowerCase().includes(query)
        );

        const filteredCandidates = subs.filter(s =>
          (s.contractorName && s.contractorName.toLowerCase().includes(query)) ||
          s.id.toLowerCase().includes(query) ||
          (s.remarks && s.remarks.toLowerCase().includes(query))
        );

        setSearchResults({
          requisitions: filteredReqs,
          contractors: filteredContractors,
          vendors: filteredVendors,
          candidates: filteredCandidates,
        });
      }

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [searchQuery]);

  const getCircleColor = (priority) => {
    if (priority === 'high') return '#D97706'; // warning (orange)
    if (priority === 'medium') return '#2563EB'; // primary (blue)
    return '#9CA3AF'; // low (light gray)
  };

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  if (loading) {
    return <Loader message="Loading workspace details..." />;
  }

  if (error) {
    return <Alert variant="danger" className="enterprise-alert enterprise-alert-danger">{error}</Alert>;
  }

  return (
    <div>
      {/* Search active view */}
      {searchQuery.trim() ? (
        <div>
          {/* Header */}
          <div className="mb-4">
            <h1 className="page-title mb-1">Global Search Results</h1>
            <p className="muted-text">Showing search hits matching &ldquo;<strong>{searchQuery}</strong>&rdquo;</p>
          </div>

          <div className="d-flex flex-column gap-4">
            {/* Requisitions */}
            <div className="enterprise-table-container p-4">
              <h5 className="small fw-semibold text-uppercase text-muted mb-3">Requisitions ({searchResults.requisitions.length})</h5>
              {searchResults.requisitions.length > 0 ? (
                <Table headers={['Job ID', 'Job Title', 'Client', 'Status', 'Action']}>
                  {searchResults.requisitions.map(r => (
                    <tr key={r.id}>
                      <td className="fw-bold">{r.id}</td>
                      <td className="fw-semibold text-dark">{r.jobTitle}</td>
                      <td>{r.clientName || 'Internal'}</td>
                      <td>
                        <span className={`status-pill ${r.status === 'OPEN' ? 'success' : 'secondary'}`}>{r.status}</span>
                      </td>
                      <td>
                        <button className="btn-enterprise-secondary py-1 px-3" onClick={() => navigate('/manager/requisitions')}>View</button>
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-muted small mb-0">No matching job requisitions found.</p>
              )}
            </div>

            {/* Contractors */}
            <div className="enterprise-table-container p-4">
              <h5 className="small fw-semibold text-uppercase text-muted mb-3">Contractors & Placements ({searchResults.contractors.length})</h5>
              {searchResults.contractors.length > 0 ? (
                <Table headers={['ID', 'Contractor Name', 'Job Title', 'Status', 'Action']}>
                  {searchResults.contractors.map(a => (
                    <tr key={a.id}>
                      <td className="fw-bold">{a.id}</td>
                      <td className="fw-semibold text-dark">{a.contractorName}</td>
                      <td>{a.requisitionTitle || 'Contractor'}</td>
                      <td>
                        <span className={`status-pill ${a.status === 'ACTIVE' ? 'success' : 'secondary'}`}>{a.status}</span>
                      </td>
                      <td>
                        <button className="btn-enterprise-secondary py-1 px-3" onClick={() => navigate('/manager/assignments')}>View</button>
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-muted small mb-0">No matching active contractor placements found.</p>
              )}
            </div>

            {/* Candidates */}
            <div className="enterprise-table-container p-4">
              <h5 className="small fw-semibold text-uppercase text-muted mb-3">Candidate Submissions ({searchResults.candidates.length})</h5>
              {searchResults.candidates.length > 0 ? (
                <Table headers={['Submission ID', 'Candidate Name', 'Proposed Rate', 'Status', 'Action']}>
                  {searchResults.candidates.map(s => (
                    <tr key={s.id}>
                      <td className="fw-bold">{s.id}</td>
                      <td className="fw-semibold text-dark">{s.contractorName}</td>
                      <td className="text-success fw-bold">₹{s.proposedRate}/day</td>
                      <td>
                        <span className={`status-pill ${s.status === 'SUBMITTED' ? 'warning' : 'secondary'}`}>{s.status}</span>
                      </td>
                      <td>
                        <button className="btn-enterprise-secondary py-1 px-3" onClick={() => navigate('/manager/vendor-submissions')}>Review</button>
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-muted small mb-0">No matching candidate submissions found.</p>
              )}
            </div>

            {/* Vendors */}
            <div className="enterprise-table-container p-4">
              <h5 className="small fw-semibold text-uppercase text-muted mb-3">Vendors ({searchResults.vendors.length})</h5>
              {searchResults.vendors.length > 0 ? (
                <Table headers={['Vendor ID', 'Vendor Name', 'Contact Email']}>
                  {searchResults.vendors.map(v => (
                    <tr key={v.id}>
                      <td className="fw-bold">{v.id}</td>
                      <td className="fw-semibold text-dark">{v.name}</td>
                      <td>{v.email}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-muted small mb-0">No matching vendor organizations found.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Dashboard View */
        <div>
          {/* Top Header Row */}
          <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1 className="page-title mb-1">Hiring Manager Workspace</h1>
              <p className="muted-text">Oversee talent demand, approve timesheets, and manage placements.</p>
            </div>
            <div>
              <button onClick={() => navigate('/manager/create-requisition')} className="btn-enterprise-primary">
                <i className="bi bi-plus-circle me-2"></i> New Requisition
              </button>
            </div>
          </div>

          {/* Stats Summary Cards Row */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <KpiCard
                label="Open Requisitions"
                value={stats.openJobs}
                icon="bi-journal-list"
                trend={{ value: 'Active', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Pending Profiles"
                value={stats.pendingSubmissions}
                icon="bi-inbox"
                trend={{ value: 'Unreviewed', direction: 'warning' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Active Contractors"
                value={stats.activeContractors}
                icon="bi-people"
                trend={{ value: 'Working', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Total BU Spend"
                value={`₹${parseFloat(stats.totalSpend || 0).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
                icon="bi-wallet2"
                trend={{ value: 'Budget Drawn', direction: 'up' }}
              />
            </div>
          </div>

          {/* First Row: Requisition Overview & Quick Actions */}
          <div className="row g-4 mb-4 align-items-stretch">
            {/* Requisition Overview */}
            <div className="col-lg-8">
              <div className="enterprise-table-container p-4 h-100">
                <h5 className="small fw-semibold text-uppercase text-muted mb-4"><i className="bi bi-clipboard-data me-2"></i>Requisition Overview</h5>
                <div className="d-flex flex-column gap-4">
                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-dark">Fill Rate</span>
                      <span>{stats.fillRate}% ({stats.filledJobs} filled / {stats.openJobs + stats.filledJobs} total)</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-success" style={{ width: `${stats.fillRate}%` }}></div>
                    </div>
                  </div>
                  <div className="row g-3 pt-1">
                    <div className="col-4">
                      <div className="text-muted small">Pending Timesheets</div>
                      <div className="fs-5 fw-bold text-dark">{stats.pendingTimesheets}</div>
                    </div>
                    <div className="col-4">
                      <div className="text-muted small">Pending Leave Requests</div>
                      <div className="fs-5 fw-bold text-dark">{stats.pendingLeaves}</div>
                    </div>
                    <div className="col-4">
                      <div className="text-muted small">Invoices Awaiting Billing</div>
                      <div className="fs-5 fw-bold text-dark">{stats.invoicesAwaiting}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="col-lg-4">
              <div className="enterprise-table-container p-4 h-100 d-flex flex-column">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Quick Actions</h5>
                <div className="d-flex flex-column gap-3 pe-1 flex-grow-1" style={{ overflowY: 'auto' }}>
                  {quickActionsList.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(action.path)}
                      className="btn-enterprise-secondary text-start px-3 d-flex align-items-start"
                      style={{ width: '100%', height: 'auto', minHeight: 'var(--gf-btn-height)', paddingTop: '10px', paddingBottom: '10px' }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          border: `2px solid ${getCircleColor(action.priority)}`,
                          marginRight: '12px',
                          marginTop: '5px'
                        }}
                      />
                      <div style={{ minWidth: '0' }}>
                        <div className="small fw-semibold text-dark text-truncate">{action.title}</div>
                        <div className="text-muted small" style={{ fontSize: '11px', whiteSpace: 'normal', lineHeight: '1.4' }}>{action.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Second Row: Upcoming Interviews & Recent Activity (Matched Height & Scrollable Activity) */}
          <div className="row g-4 align-items-stretch">
            {/* Left Side: Upcoming Interviews */}
            <div className="col-lg-6">
              <div className="enterprise-table-container p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <h5 className="small fw-semibold text-uppercase text-muted mb-3">
                    <i className="bi bi-calendar-event me-2"></i>Upcoming Interviews
                  </h5>
                  {upcomingInterviews.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {upcomingInterviews.map(i => (
                        <div key={i.id} className="p-2 px-3 border rounded bg-light d-flex align-items-center justify-content-between">
                          <div>
                            <div className="small fw-bold text-dark">{i.candidateName}</div>
                            <div className="text-muted" style={{ fontSize: '12px' }}>{i.date} &bull; {i.time}</div>
                          </div>
                          <button className="btn-enterprise-primary py-1 px-2" onClick={() => navigate('/manager/interviews')} style={{ fontSize: '11px' }}>Join</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small mb-0 py-1">No interviews scheduled today.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Recent Activity (Scrollable Container) */}
            <div className="col-lg-6">
              <div className="enterprise-table-container p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <h5 className="small fw-semibold text-uppercase text-muted mb-3">
                    <i className="bi bi-clock-history me-2"></i>Recent Activity
                  </h5>
                  {recentActivities.length > 0 ? (
                    <div className="d-flex flex-column gap-2 pe-1" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      {recentActivities.map(act => (
                        <div className="border-start ps-3 py-1 position-relative" key={act.NotificationID || act.id} style={{ borderColor: 'var(--gf-border)' }}>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{new Date(act.CreatedDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                          <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>{act.Title || act.Category}</div>
                          <div className="text-muted text-truncate" style={{ fontSize: '12px', maxWidth: '100%' }}>
                            {act.Message}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small mb-0 py-1">No recent system logs.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
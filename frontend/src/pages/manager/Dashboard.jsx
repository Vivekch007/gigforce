import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Row, Col } from 'react-bootstrap';
import { Chart, registerables } from 'chart.js';
import { useAuth } from '../../hooks/useAuth';
import { getRequisitions } from '../../services/requisitionService';
import { searchSubmissions } from '../../services/vendorSubmissionService';
import { getAssignments } from '../../services/assignmentService';
import { getTimesheetsToApprove, getLeavesToApprove } from '../../services/approvalService';
import { getInterviews } from '../../services/interviewService';
import { getMyNotifications } from '../../services/notificationService';
import { getBusinessUnitDashboard } from '../../services/managerAnalyticsService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import KpiCard from '../../components/KpiCard';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

// Register Chart.js components
Chart.register(...registerables);

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

  // Chart Canvas Refs
  const hiringTrendCanvasRef = useRef(null);
  const fillRateCanvasRef = useRef(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        reqsData,
        subsData,
        asnData,
        tsData,
        leavesData,
        interviewsData,
        notificationsData,
        buDashboard,
      ] = await Promise.all([
        getRequisitions({ size: 100 }).catch(() => ({ content: [] })),
        searchSubmissions({ size: 100 }).catch(() => ({ content: [] })),
        getAssignments({ size: 100 }).catch(() => ({ content: [] })),
        getTimesheetsToApprove().catch(() => []),
        getLeavesToApprove().catch(() => []),
        getInterviews().catch(() => []),
        getMyNotifications().catch(() => []),
        getBusinessUnitDashboard(user?.orgUnitId || 'all').catch(() => null),
      ]);

      const reqs = reqsData?.content || [];
      const subs = subsData?.content || [];
      const asns = asnData?.content || [];
      
      const openJobsCount = reqs.filter(r => r.status === 'OPEN').length;
      const pendingSubsCount = subs.filter(s => s.status === 'SUBMITTED').length;
      const activeContractorsCount = asns.filter(a => a.status === 'ACTIVE').length;
      const pendingTimesheetsCount = tsData.filter(t => t.status === 'SUBMITTED').length;
      const pendingLeavesCount = leavesData.filter(l => l.status === 'PENDING').length;
      
      const approvedUnbilledTimesheetsCount = tsData.filter(t => t.status === 'APPROVED' && !t.billed).length;

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

      // Filter out 'Timesheet Submitted' activity log entries (User Request 2)
      const filteredNotifs = notificationsData.filter(act => {
        const titleText = (act.Title || '').toLowerCase();
        const msgText = (act.Message || '').toLowerCase();
        return !titleText.includes('timesheet submitted') && !msgText.includes('timesheet submitted');
      });
      setRecentActivities(filteredNotifs.slice(0, 5));

      // Assemble merged Quick Actions list (User Request 4 & 5)
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
      if (approvedUnbilledTimesheetsCount > 0) {
        actions.push({
          title: 'Create Contractor Invoices',
          desc: `${approvedUnbilledTimesheetsCount} approved timesheets ready for billing.`,
          path: '/manager/invoice-creation',
          priority: 'medium'
        });
      }
      
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

  // Initializing Chart.js charts
  useEffect(() => {
    if (loading || searchQuery.trim()) return;

    let trendChartInstance = null;
    let fillChartInstance = null;

    if (hiringTrendCanvasRef.current) {
      const ctx = hiringTrendCanvasRef.current.getContext('2d');
      trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [{
            label: 'Placements',
            data: [5, 12, 18, 25, 30, stats.activeContractors],
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#2563EB',
            pointBorderColor: '#FFFFFF',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: '#E5E7EB', drawTicks: false },
              border: { dash: [4, 4] }
            }
          }
        }
      });
    }

    if (fillRateCanvasRef.current) {
      const ctx = fillRateCanvasRef.current.getContext('2d');
      fillChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Filled', 'Open'],
          datasets: [{
            data: [stats.fillRate, 100 - stats.fillRate],
            backgroundColor: ['#16A34A', '#F3F4F6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    return () => {
      if (trendChartInstance) trendChartInstance.destroy();
      if (fillChartInstance) fillChartInstance.destroy();
    };
  }, [loading, searchQuery, stats]);

  const getCircleColor = (priority) => {
    if (priority === 'high') return '#D97706'; // warning (orange)
    if (priority === 'medium') return '#2563EB'; // primary (blue)
    return '#9CA3AF'; // low (light gray)
  };

  if (loading) {
    return <Loader message="Loading workspace details..." />;
  }

  if (error) {
    showToast(error, 'error');
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

          {/* Stats Summary Cards Row using KpiCard (Monetary values updated to ₹) */}
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

          <div className="row g-4">
            {/* Left Column (Merged Action Required into Quick Actions) */}
            <div className="col-lg-8 d-flex flex-column gap-4">
              {/* Charts Panel using Chart.js canvases */}
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-4"><i className="bi bi-bar-chart-line me-2"></i>Workforce Summary Analytics</h5>
                <div className="row g-4">
                  {/* Hiring Trend */}
                  <div className="col-md-6">
                    <h6 className="fw-bold text-dark mb-3 text-center small text-uppercase">Hiring Trend (Last 6 Months)</h6>
                    <div style={{ height: '180px', position: 'relative' }}>
                      <canvas ref={hiringTrendCanvasRef} />
                    </div>
                  </div>

                  {/* Fill Rate circular gauge */}
                  <div className="col-md-6 d-flex flex-column align-items-center justify-content-center">
                    <h6 className="fw-bold text-dark mb-3 text-center small text-uppercase">Requisition Fill Rate</h6>
                    <div style={{ width: '130px', height: '130px', position: 'relative' }}>
                      <canvas ref={fillRateCanvasRef} />
                      <div className="position-absolute start-50 top-50 translate-middle text-center" style={{ zIndex: 1 }}>
                        <div className="fs-4 fw-bold text-dark">{stats.fillRate}%</div>
                        <div className="text-muted" style={{ fontSize: '10px' }}>Filled Jobs</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Performance */}
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3"><i className="bi bi-building me-2"></i>Top Vendor Placement Performance</h5>
                <div className="d-flex flex-column gap-3 py-1">
                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-dark">TCS (Tata Consultancy Services)</span>
                      <span>85% (12 hired / 14 proposed)</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-success" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-dark">Infosys Limited</span>
                      <span>70% (7 hired / 10 proposed)</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-success" style={{ width: '70%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-dark">Wipro Org</span>
                      <span>50% (4 hired / 8 proposed)</span>
                    </div>
                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                      <div className="progress-bar bg-warning" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-4 d-flex flex-column gap-4">
              {/* Quick Actions (Merged and featuring Priority Indicators - User Requests 4 & 5) */}
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Quick Actions</h5>
                <div className="d-flex flex-column gap-3">
                  {quickActionsList.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(action.path)}
                      className="btn-enterprise-secondary text-start py-3 px-3 d-flex align-items-center"
                      style={{ width: '100%' }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          border: `2px solid ${getCircleColor(action.priority)}`,
                          marginRight: '12px'
                        }}
                      />
                      <div style={{ minWidth: '0' }}>
                        <div className="small fw-semibold text-dark text-truncate">{action.title}</div>
                        <div className="text-muted small text-truncate" style={{ fontSize: '11px' }}>{action.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upcoming Interviews List */}
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3"><i className="bi bi-calendar-event me-2"></i>Upcoming Interviews</h5>
                {upcomingInterviews.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {upcomingInterviews.map(i => (
                      <div key={i.id} className="p-3 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                        <div>
                          <div className="small fw-bold text-dark">{i.candidateName}</div>
                          <div className="text-muted small">{i.date} &bull; {i.time}</div>
                        </div>
                        <button className="btn-enterprise-primary py-1 px-3 small" onClick={() => navigate('/manager/interviews')} style={{ fontSize: '12px' }}>Join</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0 py-2">No interviews scheduled today.</p>
                )}
              </div>

              {/* Recent Activity Timeline (Filtered out Timesheet Submissions) */}
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Recent Activity</h5>
                {recentActivities.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {recentActivities.map(act => (
                      <div className="border-start ps-3 py-1 position-relative" key={act.NotificationID} style={{ borderColor: 'var(--gf-border)' }}>
                        <div className="text-muted small">{new Date(act.CreatedDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                        <div className="small fw-semibold text-dark">{act.Title || act.Category}</div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '100%' }}>
                          {act.Message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0 py-2">No recent system logs.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

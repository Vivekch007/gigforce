import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Button } from 'react-bootstrap';
import { getRequisitions } from '../../services/requisitionService';
import { searchSubmissions } from '../../services/vendorSubmissionService';
import { getAssignments } from '../../services/managerAssignmentService';
import { getTimesheetsToApprove, getLeavesToApprove } from '../../services/approvalService';
import { getInterviews } from '../../services/interviewService';
import { getMyNotifications } from '../../services/notificationService';
import { getErrorMessage } from '../../services/errorUtils';
import '../../styles/contractor.css'; // Reuse contractor workspace card, badge, and grid CSS classes

function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard data states
  const [stats, setStats] = useState({
    openJobs: 0,
    pendingSubmissions: 0,
    activeContractors: 0,
    pendingTimesheets: 0,
    pendingLeaves: 0,
    invoicesAwaiting: 0,
  });

  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [team, setTeam] = useState([]);

  // Search result lists (for global search view)
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

      // Fetch all required data in parallel
      const [
        reqsData,
        subsData,
        asnData,
        tsData,
        leavesData,
        interviewsData,
        notificationsData,
      ] = await Promise.all([
        getRequisitions({ size: 100 }).catch(() => ({ content: [] })),
        searchSubmissions({ size: 100 }).catch(() => ({ content: [] })),
        getAssignments({ size: 100 }).catch(() => ({ content: [] })),
        getTimesheetsToApprove().catch(() => []),
        getLeavesToApprove().catch(() => []),
        getInterviews().catch(() => []),
        getMyNotifications().catch(() => []),
      ]);

      const reqs = reqsData?.content || [];
      const subs = subsData?.content || [];
      const asns = asnData?.content || [];
      
      // Calculate Stats
      const openJobsCount = reqs.filter(r => r.status === 'OPEN').length;
      const pendingSubsCount = subs.filter(s => s.status === 'SUBMITTED').length;
      const activeContractorsCount = asns.filter(a => a.status === 'ACTIVE').length;
      const pendingTimesheetsCount = tsData.filter(t => t.status === 'SUBMITTED').length;
      const pendingLeavesCount = leavesData.filter(l => l.status === 'PENDING').length;
      
      // Invoice creation is system-generated from approved timesheets that have not been invoiced
      const approvedUnbilledTimesheetsCount = tsData.filter(t => t.status === 'APPROVED' && !t.billed).length;

      setStats({
        openJobs: openJobsCount,
        pendingSubmissions: pendingSubsCount,
        activeContractors: activeContractorsCount,
        pendingTimesheets: pendingTimesheetsCount,
        pendingLeaves: pendingLeavesCount,
        invoicesAwaiting: approvedUnbilledTimesheetsCount,
      });

      // Filter upcoming interviews
      setUpcomingInterviews(interviewsData.filter(i => i.status === 'SCHEDULED').slice(0, 3));

      // Filter recent system activity from notifications
      setRecentActivities(notificationsData.slice(0, 5));

      // Calculate upcoming manager deadlines
      const computedDeadlines = [];
      if (pendingTimesheetsCount > 0) {
        computedDeadlines.push({
          title: 'Timesheet Approvals Required',
          desc: `${pendingTimesheetsCount} submitted contractor log sheets are awaiting review.`,
          type: 'warning',
          actionText: 'Review Timesheets',
          path: '/manager/timesheet-approvals'
        });
      }
      if (pendingLeavesCount > 0) {
        computedDeadlines.push({
          title: 'Contractor Absences Awaiting Action',
          desc: `${pendingLeavesCount} leave absence requests need approval.`,
          type: 'warning',
          actionText: 'Review Leaves',
          path: '/manager/leave-approvals'
        });
      }
      if (approvedUnbilledTimesheetsCount > 0) {
        computedDeadlines.push({
          title: 'Generate Invoices',
          desc: `${approvedUnbilledTimesheetsCount} approved timesheets are ready for invoice creation.`,
          type: 'info',
          actionText: 'Create Invoices',
          path: '/manager/invoice-creation'
        });
      }
      // Add requisition deadline warnings if any open job is ending soon
      reqs.filter(r => r.status === 'OPEN').forEach(r => {
        if (r.endDate) {
          const daysLeft = Math.ceil((new Date(r.endDate) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0 && daysLeft <= 7) {
            computedDeadlines.push({
              title: `Job Closing Soon: ${r.jobTitle}`,
              desc: `Requisition ${r.id} closes in ${daysLeft} days. Review remaining vacancies.`,
              type: 'danger',
              actionText: 'View Job',
              path: '/manager/requisitions'
            });
          }
        }
      });

      setDeadlines(computedDeadlines);

      // Calculate Contractor Team Statuses
      const activeAsns = asns.filter(a => a.status === 'ACTIVE');
      const teamList = activeAsns.map(a => {
        let statusText = 'Working / Compliant';
        let badgeType = 'approved';

        const hasPendingTs = tsData.some(t => t.status === 'SUBMITTED' && t.contractorName === a.contractorName);
        const hasPendingLeave = leavesData.some(l => l.status === 'PENDING' && l.contractorName === a.contractorName);

        if (hasPendingTs) {
          statusText = 'Timesheet Pending';
          badgeType = 'pending';
        } else if (hasPendingLeave) {
          statusText = 'Leave Requested';
          badgeType = 'info';
        } else if (a.endDate) {
          const daysLeft = Math.ceil((new Date(a.endDate) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0 && daysLeft <= 14) {
            statusText = `Ends in ${daysLeft} days`;
            badgeType = 'rejected';
          }
        }

        return {
          id: a.id,
          name: a.contractorName || 'Contractor',
          role: a.requisitionTitle || 'Specialist',
          statusText,
          badgeType,
        };
      });

      setTeam(teamList);

      // Handle global search filtering if searchQuery is active
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();

        // 1. Filter Requisitions
        const filteredReqs = reqs.filter(r => 
          r.id.toLowerCase().includes(query) ||
          r.jobTitle.toLowerCase().includes(query) ||
          (r.clientName && r.clientName.toLowerCase().includes(query)) ||
          r.status.toLowerCase().includes(query)
        );

        // 2. Filter Contractors
        const filteredContractors = asns.filter(a => 
          (a.contractorName && a.contractorName.toLowerCase().includes(query)) ||
          a.id.toLowerCase().includes(query) ||
          (a.requisitionTitle && a.requisitionTitle.toLowerCase().includes(query))
        );

        // 3. Filter Vendors
        // Aggregate vendors from submissions/assignments
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

        // 4. Filter Candidates (from submissions)
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted small mt-2">Loading workspace details...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="m-3">{error}</Alert>;
  }

  return (
    <div className="container-fluid">
      {/* Search active view */}
      {searchQuery.trim() ? (
        <div>
          {/* Header */}
          <div className="mb-4">
            <h2 className="fw-black text-slate-800 mb-0">Global Search Results</h2>
            <p className="text-muted small mt-1">Showing search hits matching &ldquo;<strong>{searchQuery}</strong>&rdquo;</p>
          </div>

          <div className="d-flex flex-column gap-4">
            {/* 1. Requisitions section */}
            <div className="gf-card">
              <h5 className="fw-bold mb-3 text-slate-800">💼 Requisitions ({searchResults.requisitions.length})</h5>
              {searchResults.requisitions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Job ID</th>
                        <th>Job Title</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.requisitions.map(r => (
                        <tr key={r.id}>
                          <td className="fw-bold">{r.id}</td>
                          <td className="fw-semibold text-slate-800">{r.jobTitle}</td>
                          <td>{r.clientName || 'Internal'}</td>
                          <td>
                            <span className={`gf-badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                          </td>
                          <td>
                            <Button size="sm" className="btn-gf-primary py-1" onClick={() => navigate('/manager/requisitions')}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No matching job requisitions found.</p>
              )}
            </div>

            {/* 2. Contractors section */}
            <div className="gf-card">
              <h5 className="fw-bold mb-3 text-slate-800">👤 Contractors & Placements ({searchResults.contractors.length})</h5>
              {searchResults.contractors.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Contractor Name</th>
                        <th>Job Title</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.contractors.map(a => (
                        <tr key={a.id}>
                          <td className="fw-bold">{a.id}</td>
                          <td className="fw-semibold text-slate-800">{a.contractorName}</td>
                          <td>{a.requisitionTitle || 'Contractor'}</td>
                          <td>
                            <span className={`gf-badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                          </td>
                          <td>
                            <Button size="sm" className="btn-gf-primary py-1" onClick={() => navigate('/manager/assignments')}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No matching active contractor profiles found.</p>
              )}
            </div>

            {/* 3. Candidates section */}
            <div className="gf-card">
              <h5 className="fw-bold mb-3 text-slate-800">📥 Candidate Submissions ({searchResults.candidates.length})</h5>
              {searchResults.candidates.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Submission ID</th>
                        <th>Candidate Name</th>
                        <th>Proposed Rate</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.candidates.map(s => (
                        <tr key={s.id}>
                          <td className="fw-bold">{s.id}</td>
                          <td className="fw-semibold text-slate-800">{s.contractorName}</td>
                          <td className="text-green-600 fw-bold">${s.proposedRate}/day</td>
                          <td>
                            <span className={`gf-badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
                          </td>
                          <td>
                            <Button size="sm" className="btn-gf-primary py-1" onClick={() => navigate('/manager/vendor-submissions')}>Review</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted small mb-0">No matching candidate submissions found.</p>
              )}
            </div>

            {/* 4. Vendors section */}
            <div className="gf-card">
              <h5 className="fw-bold mb-3 text-slate-800">🏢 Vendors ({searchResults.vendors.length})</h5>
              {searchResults.vendors.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Vendor ID</th>
                        <th>Vendor Name</th>
                        <th>Contact Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.vendors.map(v => (
                        <tr key={v.id}>
                          <td className="fw-bold">{v.id}</td>
                          <td className="fw-semibold text-slate-800">{v.name}</td>
                          <td>{v.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
          <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h2 className="fw-black text-slate-800 mb-0">Hiring Manager Workspace</h2>
              <p className="text-muted small mt-1 mb-0">Oversee talent demand, approve timesheets, and manage placements.</p>
            </div>
            <div className="d-flex gap-2">
              <Button onClick={() => navigate('/manager/create-requisition')} className="btn-gf-primary">
                ➕ New Requisition
              </Button>
            </div>
          </div>

          {/* Stats Summary Cards Row */}
          <div className="row g-3 mb-4">
            <div className="col-lg-3 col-md-6">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Open Requisitions</span>
                  <h3 className="fw-black text-slate-800 mt-1 mb-0">{stats.openJobs}</h3>
                </div>
                <p className="text-muted small mb-0 mt-2">Active recruitment jobs</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending Profiles</span>
                  <h3 className="fw-black text-amber-600 mt-1 mb-0">{stats.pendingSubmissions}</h3>
                </div>
                <p className="text-muted small mb-0 mt-2">Vendor submissions to review</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Active Contractors</span>
                  <h3 className="fw-black text-green-600 mt-1 mb-0">{stats.activeContractors}</h3>
                </div>
                <p className="text-muted small mb-0 mt-2">Onboarded contractors working</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending approvals</span>
                  <h3 className="fw-black text-red-600 mt-1 mb-0">{stats.pendingTimesheets + stats.pendingLeaves}</h3>
                </div>
                <p className="text-muted small mb-0 mt-2">{stats.pendingTimesheets} timesheets, {stats.pendingLeaves} leaves</p>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Left Column - 8 Cols */}
            <div className="col-lg-8">
              {/* Upcoming Deadlines checklist widget */}
              {deadlines.length > 0 && (
                <div className="gf-card mb-4 border-warning">
                  <h5 className="fw-bold mb-3 text-slate-800 d-flex align-items-center gap-2">
                    <span>📅</span> Action Required
                  </h5>
                  <div className="d-flex flex-column gap-2">
                    {deadlines.map((dl, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-light border-start border-4 border-warning flex-wrap gap-2">
                        <div>
                          <div className="fw-semibold text-slate-800">{dl.title}</div>
                          <div className="text-muted small mt-1">{dl.desc}</div>
                        </div>
                        <Button size="sm" className="btn-gf-primary py-1 px-3" onClick={() => navigate(dl.path)}>
                          {dl.actionText}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts Panel */}
              <div className="gf-card mb-4">
                <h5 className="fw-bold mb-4 text-slate-800">📊 Workforce Summary Charts</h5>
                <div className="row g-4">
                  {/* Hiring Trend */}
                  <div className="col-md-6">
                    <h6 className="fw-bold text-slate-700 mb-3 text-center">Hiring Trend (Last 6 Months)</h6>
                    <div style={{ height: '180px', position: 'relative' }}>
                      {/* CSS/SVG Area Chart */}
                      <svg viewBox="0 0 100 50" className="w-100 h-100">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,45 L20,38 L40,30 L60,18 L80,10 L100,5 L100,50 L0,50 Z" fill="url(#chartGrad)" />
                        <path d="M0,45 L20,38 L40,30 L60,18 L80,10 L100,5" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                        <line x1="0" y1="45" x2="100" y2="45" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                        <line x1="0" y1="30" x2="100" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                        <line x1="0" y1="15" x2="100" y2="15" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                      </svg>
                      <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: '0.65rem' }}>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span>Jun</span>
                        <span>Jul</span>
                      </div>
                    </div>
                  </div>

                  {/* Fill Rate circular gauge */}
                  <div className="col-md-6 d-flex flex-column align-items-center justify-content-center">
                    <h6 className="fw-bold text-slate-700 mb-3 text-center">Job Fill Rate</h6>
                    <div style={{ width: '130px', height: '130px', position: 'relative' }}>
                      <svg viewBox="0 0 36 36" className="w-100 h-100">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="2.5" 
                                strokeDasharray="72 28" strokeDashoffset="25" />
                      </svg>
                      <div className="position-absolute start-50 top-50 translate-middle text-center">
                        <div className="fs-4 fw-black text-slate-800">72%</div>
                        <div className="text-muted" style={{ fontSize: '0.55rem' }}>Filled Jobs</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Performance horizontal bars */}
              <div className="gf-card mb-0">
                <h5 className="fw-bold mb-3 text-slate-800">🏢 Top Vendor Placement Performance</h5>
                <div className="d-flex flex-column gap-3 py-1">
                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-slate-700">TCS (Tata Consultancy Services)</span>
                      <span>85% (12 hired / 14 proposed)</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-success" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-slate-700">Infosys Limited</span>
                      <span>70% (7 hired / 10 proposed)</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-success" style={{ width: '70%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-muted small mb-1">
                      <span className="fw-semibold text-slate-700">Wipro Org</span>
                      <span>50% (4 hired / 8 proposed)</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-warning" style={{ width: '50%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 4 Cols */}
            <div className="col-lg-4">
              {/* Quick Actions */}
              <div className="gf-card mb-4">
                <h5 className="fw-bold mb-3 text-slate-800">Quick Actions</h5>
                <div className="d-flex flex-column gap-2">
                  <button onClick={() => navigate('/manager/create-requisition')} className="quick-action-btn border">
                    <span className="quick-action-icon">➕</span>
                    <div>
                      <div className="small fw-semibold text-slate-800">Create Job Requisition</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>Log talent demands & launch roles</div>
                    </div>
                  </button>

                  <button onClick={() => navigate('/manager/vendor-submissions')} className="quick-action-btn border">
                    <span className="quick-action-icon">📥</span>
                    <div>
                      <div className="small fw-semibold text-slate-800">Review Submissions</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>Evaluate vendor contractor profiles</div>
                    </div>
                  </button>

                  <button onClick={() => navigate('/manager/timesheet-approvals')} className="quick-action-btn border">
                    <span className="quick-action-icon">⏱️</span>
                    <div>
                      <div className="small fw-semibold text-slate-800">Approve Timesheets</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>Sign off on weekly work logs</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upcoming Interviews List */}
              <div className="gf-card mb-4">
                <h5 className="fw-bold mb-3 text-slate-800">📅 Upcoming Interviews</h5>
                {upcomingInterviews.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {upcomingInterviews.map(i => (
                      <div key={i.id} className="p-2 border rounded-3 bg-light d-flex align-items-center justify-content-between">
                        <div>
                          <div className="small fw-bold text-slate-800">{i.candidateName}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{i.date} &bull; {i.time}</div>
                        </div>
                        <Button size="sm" className="btn-gf-primary py-0 px-2 small" onClick={() => navigate('/manager/interviews')} style={{ fontSize: '0.75rem' }}>Join</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0 py-2">No interviews scheduled today.</p>
                )}
              </div>

              {/* My Team Widget */}
              <div className="gf-card mb-4">
                <h5 className="fw-bold mb-3 text-slate-800">👥 My Team</h5>
                {team.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {team.map((member) => (
                      <div key={member.id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small fw-bold text-slate-800">{member.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{member.role}</div>
                        </div>
                        <span className={`gf-badge badge-${member.badgeType}`}>
                          {member.statusText}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0 py-2">No active team members supervised.</p>
                )}
              </div>

              {/* Recent Activity Timeline */}
              <div className="gf-card">
                <h5 className="fw-bold mb-3 text-slate-800">Recent Activity</h5>
                {recentActivities.length > 0 ? (
                  <div className="gf-timeline">
                    {recentActivities.map(act => (
                      <div className="timeline-item" key={act.NotificationID}>
                        <div className="timeline-time">{new Date(act.CreatedDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                        <div className="timeline-title">{act.Title || act.Category}</div>
                        <div className="timeline-desc text-truncate" style={{ maxWidth: '200px' }}>
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

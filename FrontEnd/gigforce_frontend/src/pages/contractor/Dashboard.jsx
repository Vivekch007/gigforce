import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button, Table } from 'react-bootstrap';
import { getPersonalDashboard } from '../../services/analyticsService';
import { getMyProfile, getProfileCerts } from '../../services/contractorService';
import { getAssignments } from '../../services/assignmentService';
import { getMyNotifications } from '../../services/notificationService';
import { getTimesheets } from '../../services/timesheetService';
import { getErrorMessage } from '../../services/errorUtils';
import '../../styles/contractor.css';

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard states
  const [personalStats, setPersonalStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Fetch Profile me (to get display name and verify setup status)
        let profileData = null;
        try {
          profileData = await getMyProfile();
          if (active) setProfile(profileData);
        } catch (profileErr) {
          // If profile me 404s, it might be in setup.
          if (profileErr?.response?.status === 404) {
            // Wait 1.5s and retry profile me once
            await new Promise(resolve => setTimeout(resolve, 1500));
            profileData = await getMyProfile();
            if (active) setProfile(profileData);
          } else {
            throw profileErr;
          }
        }

        // 2. Fetch stats from reports/personal-dashboard
        const stats = await getPersonalDashboard();
        if (active) setPersonalStats(stats);

        // 3. Fetch assignments
        const assignmentsData = await getAssignments();
        const assignmentsList = assignmentsData.content || [];
        if (active) {
          setAllAssignments(assignmentsList);
          // Find the first active/extended assignment
          const activeAsn = assignmentsList.find(asn => asn.status === 'ACTIVE' || asn.status === 'EXTENDED');
          setCurrentAssignment(activeAsn || null);
        }

        // 4. Fetch recent notifications to show as activities
        const notifs = await getMyNotifications();
        if (active) {
          setActivities(notifs.slice(0, 5));
        }

        // 5. Fetch certs and timesheets to calculate upcoming deadlines
        if (profileData) {
          const [certsList, timesheetsList] = await Promise.all([
            getProfileCerts(profileData.id),
            getTimesheets()
          ]);

          if (active) {
            const deadlines = [];

            // Timesheet check
            const hasDraftTimesheet = timesheetsList.some(t => t.status === 'DRAFT' || t.status === 'REJECTED');
            if (hasDraftTimesheet) {
              deadlines.push({
                title: 'Submit Timesheet',
                date: 'Tomorrow',
                type: 'warning'
              });
            }

            // Closest expiring cert check
            const activeCerts = certsList.filter(c => c.certStatus === 'VALID' && c.expiryDate);
            if (activeCerts.length > 0) {
              const sortedCerts = [...activeCerts].sort(
                (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
              );
              const closestCert = sortedCerts[0];
              if (closestCert) {
                const expDate = new Date(closestCert.expiryDate);
                const formatted = expDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                deadlines.push({
                  title: `Certification Expiring (${closestCert.name})`,
                  date: formatted,
                  type: 'danger'
                });
              }
            }

            // Assignment end check
            const activeAsn = assignmentsList.find(asn => asn.status === 'ACTIVE' || asn.status === 'EXTENDED');
            if (activeAsn && activeAsn.endDate) {
              const endDate = new Date(activeAsn.endDate);
              const formatted = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              deadlines.push({
                title: 'Assignment Ends',
                date: formatted,
                type: 'info'
              });
            }

            setUpcomingDeadlines(deadlines);
          }
        }

      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading your workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="gf-card mt-4">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{error}</p>
        <hr />
        <Button variant="outline-danger" onClick={() => window.location.reload()}>
          Retry Loading
        </Button>
      </Alert>
    );
  }

  const welcomeName = profile?.displayName || profile?.userName || 'Contractor';

  return (
    <div className="container-fluid">
      {/* Welcome Banner */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800">Welcome, {welcomeName} 👋</h2>
          <p className="text-muted small mt-1 mb-0">
            Monitor assignments, enter weekly timesheets, and track leave requests.
          </p>
        </div>
        <div className="d-flex gap-2">
          {profile?.availabilityStatus && (
            <span className={`gf-badge badge-${profile.availabilityStatus.toLowerCase()}`}>
              Availability: {profile.availabilityStatus.replace('_', ' ')}
            </span>
          )}
          {profile?.profileStatus && profile.profileStatus !== 'ACTIVE' && (
            <span className={`gf-badge badge-${profile.profileStatus.toLowerCase()}`}>
              Profile: {profile.profileStatus}
            </span>
          )}
        </div>
      </div>

      <div className="row">
        {/* Main Section - Left 2 Columns */}
        <div className="col-lg-8">
          {/* Summary Metric Cards */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-md-3">
              <div className="gf-card p-3 mb-0 h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>
                      Assignments
                    </span>
                    <h3 className="fw-black text-slate-800 mt-1 mb-0">
                      {personalStats?.activeAssignmentsCount ?? 0}
                    </h3>
                  </div>
                  <div className="metric-icon-box bg-blue-light">💼</div>
                </div>
                <p className="text-muted small mb-0 mt-2">Active placements</p>
              </div>
            </div>

            <div className="col-sm-6 col-md-3">
              <div className="gf-card p-3 mb-0 h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>
                      Hours Logged
                    </span>
                    <h3 className="fw-black text-slate-800 mt-1 mb-0">
                      {personalStats?.totalHoursLogged ?? '0.00'}
                    </h3>
                  </div>
                  <div className="metric-icon-box bg-purple-light">⏱️</div>
                </div>
                <p className="text-muted small mb-0 mt-2">Total accumulated hours</p>
              </div>
            </div>

            <div className="col-sm-6 col-md-3">
              <div className="gf-card p-3 mb-0 h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>
                      Pending Timesheets
                    </span>
                    <h3 className="fw-black text-amber-600 mt-1 mb-0">
                      {personalStats?.pendingTimesheetsCount ?? 0}
                    </h3>
                  </div>
                  <div className="metric-icon-box bg-amber-light">📝</div>
                </div>
                <p className="text-muted small mb-0 mt-2">Awaiting submission</p>
              </div>
            </div>

            <div className="col-sm-6 col-md-3">
              <div className="gf-card p-3 mb-0 h-100 d-flex flex-column justify-content-between">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>
                      Total Earnings
                    </span>
                    <h3 className="fw-black text-green-600 mt-1 mb-0">
                      ${personalStats?.totalPaidAmount ? parseFloat(personalStats.totalPaidAmount).toLocaleString() : '0.00'}
                    </h3>
                  </div>
                  <div className="metric-icon-box bg-green-light">💰</div>
                </div>
                <p className="text-muted small mb-0 mt-2">Paid disbursements</p>
              </div>
            </div>
          </div>

          {/* Current Assignment Details */}
          <div className="gf-card">
            <h5 className="fw-bold mb-3 text-slate-800">Current Assignment</h5>
            {currentAssignment ? (
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 bg-light rounded-3 h-100">
                    <p className="text-muted small mb-1">ROLE TITLE</p>
                    <h6 className="fw-bold text-slate-800 mb-2">{currentAssignment.requisitionTitle || 'Gig Contractor'}</h6>
                    <span className={`gf-badge badge-${currentAssignment.status.toLowerCase()}`}>
                      {currentAssignment.status}
                    </span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 h-100">
                    <div className="row row-cols-2 g-2">
                      <div>
                        <span className="text-muted small block">Manager</span>
                        <p className="fw-semibold text-slate-800 small mb-0">{currentAssignment.hiringManagerName}</p>
                      </div>
                      <div>
                        <span className="text-muted small block">Day Rate</span>
                        <p className="fw-semibold text-green-600 small mb-0">${currentAssignment.agreedRatePerDay}</p>
                      </div>
                      <div>
                        <span className="text-muted small block">Start Date</span>
                        <p className="fw-semibold text-slate-800 small mb-0">{currentAssignment.startDate}</p>
                      </div>
                      <div>
                        <span className="text-muted small block">End Date</span>
                        <p className="fw-semibold text-slate-800 small mb-0">{currentAssignment.endDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-light rounded-3">
                <span className="fs-2">📁</span>
                <p className="text-muted small mt-2 mb-0">No active assignment found.</p>
              </div>
            )}
          </div>

          {/* Assignments Summary Grid */}
          <div className="gf-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-slate-800 mb-0">Assignment Placements</h5>
              <Link to="/contractor/assignments" className="text-decoration-none small fw-semibold text-primary">
                View All &rarr;
              </Link>
            </div>
            {allAssignments.length > 0 ? (
              <Table responsive hover className="align-middle border-top text-sm mb-0">
                <thead>
                  <tr className="text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
                    <th>Role</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allAssignments.slice(0, 3).map((asn) => (
                    <tr key={asn.id}>
                      <td className="fw-semibold text-slate-800">{asn.requisitionTitle || 'Contractor'}</td>
                      <td>{asn.startDate}</td>
                      <td>{asn.endDate}</td>
                      <td className="text-green-600 fw-semibold">${asn.agreedRatePerDay}/day</td>
                      <td>
                        <span className={`gf-badge badge-${asn.status.toLowerCase()}`}>
                          {asn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted small mb-0 py-2">No placements logged.</p>
            )}
          </div>
        </div>

        {/* Sidebar Panel - Right 1 Column */}
        <div className="col-lg-4">
          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div className="gf-card">
              <h5 className="fw-bold mb-3 text-slate-800 d-flex align-items-center gap-2">
                <span>📅</span> Upcoming
              </h5>
              <div className="d-flex flex-column gap-3">
                {upcomingDeadlines.map((dl, idx) => (
                  <div key={idx} className="ps-2 position-relative">
                    <div className="position-absolute start-0 top-0 mt-1" style={{ color: 'var(--gf-primary)', fontSize: '1rem' }}>•</div>
                    <div className="ms-3">
                      <div className="small fw-semibold text-slate-800">{dl.title}</div>
                      <div className="text-muted text-xs font-medium" style={{ fontSize: '0.75rem' }}>{dl.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="gf-card">
            <h5 className="fw-bold mb-3 text-slate-800">Quick Actions</h5>
            <div className="d-flex flex-column gap-2">
              <button 
                onClick={() => navigate('/contractor/timesheets')} 
                className="quick-action-btn border"
              >
                <span className="quick-action-icon">⏱️</span>
                <div>
                  <div className="small fw-semibold text-slate-800">Fill Weekly Timesheet</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>Log work details & submit logs</div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/contractor/profile')} 
                className="quick-action-btn border"
              >
                <span className="quick-action-icon">👤</span>
                <div>
                  <div className="small fw-semibold text-slate-800">Update Profile Details</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>Modify experience & skills</div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/contractor/assignments')} 
                className="quick-action-btn border"
              >
                <span className="quick-action-icon">📋</span>
                <div>
                  <div className="small fw-semibold text-slate-800">View Active Assignments</div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>Check SOW & agreed rates</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="gf-card">
            <h5 className="fw-bold mb-3 text-slate-800">Recent Activity</h5>
            {activities.length > 0 ? (
              <div className="gf-timeline">
                {activities.map((act) => (
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
  );
}

export default Dashboard;

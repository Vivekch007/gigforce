import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { getPersonalDashboard } from '../../services/analyticsService';
import { getMyProfile, getProfileCerts } from '../../services/contractorService';
import { getAssignments } from '../../services/assignmentService';
import { getMyNotifications } from '../../services/notificationService';
import { getTimesheets } from '../../services/timesheetService';
import { getErrorMessage } from '../../services/errorUtils';
import KpiCard from '../../components/KpiCard';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [personalStats, setPersonalStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [recentTimesheets, setRecentTimesheets] = useState([]);
  const [showTotalEarnings, setShowTotalEarnings] = useState(() => sessionStorage.getItem('gf_earnings_visible') === 'true');
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEarnings, setDisplayEarnings] = useState(() => sessionStorage.getItem('gf_earnings_visible') === 'true');

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setDisplayEarnings(showTotalEarnings);
      setIsAnimating(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [showTotalEarnings]);

  const toggleEarnings = () => {
    setShowTotalEarnings(prev => {
      const next = !prev;
      sessionStorage.setItem('gf_earnings_visible', next ? 'true' : 'false');
      return next;
    });
  };

  const formatRupees = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `₹ ${formatted}`;
  };

  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        let profileData = null;
        try {
          profileData = await getMyProfile();
          if (active) setProfile(profileData);
        } catch (profileErr) {
          if (profileErr?.response?.status === 404) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            profileData = await getMyProfile();
            if (active) setProfile(profileData);
          } else {
            throw profileErr;
          }
        }

        const stats = await getPersonalDashboard();
        if (active) setPersonalStats(stats);

        const assignmentsData = await getAssignments();
        const assignmentsList = assignmentsData.content || [];
        if (active) {
          setAllAssignments(assignmentsList);
          const activeAsn = assignmentsList.find(asn => asn.status === 'ACTIVE' || asn.status === 'EXTENDED');
          setCurrentAssignment(activeAsn || null);
        }

        const notifs = await getMyNotifications();
        if (active) {
          setActivities(notifs.slice(0, 5));
        }

        if (profileData) {
          const [certsList, timesheetsList] = await Promise.all([
            getProfileCerts(profileData.id),
            getTimesheets()
          ]);

          if (active) {
            setRecentTimesheets(timesheetsList || []);
            const deadlines = [];

            const hasDraftTimesheet = timesheetsList.some(t => t.status === 'DRAFT' || t.status === 'REJECTED');
            if (hasDraftTimesheet) {
              deadlines.push({
                title: 'Submit Timesheet',
                date: 'Tomorrow',
                type: 'warning'
              });
            }

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
                  title: `Cert Expiring (${closestCert.name})`,
                  date: formatted,
                  type: 'danger'
                });
              }
            }

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
    return <Loader message="Loading your workspace..." />;
  }

  if (error) {
    return (
      <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mt-4">
        <h5>Error Loading Dashboard</h5>
        <p>{error}</p>
        <button className="btn-enterprise-secondary mt-2" onClick={() => window.location.reload()}>
          Retry Loading
        </button>
      </Alert>
    );
  }

  const welcomeName = profile?.displayName || profile?.userName || 'Contractor';

  return (
    <div>
      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h1 className="page-title mb-1">Welcome, {welcomeName}</h1>
          <p className="muted-text">Monitor assignments, enter weekly timesheets, and track leave requests.</p>
        </div>
        <div className="d-flex gap-2">
          {profile?.availabilityStatus && (
            <span className="status-pill info">
              Availability: {profile.availabilityStatus.replace('_', ' ')}
            </span>
          )}
          {profile?.profileStatus && profile.profileStatus !== 'ACTIVE' && (
            <span className="status-pill warning">
              Profile: {profile.profileStatus}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <KpiCard
            label="Active Placements"
            value={personalStats?.activeAssignmentsCount ?? 0}
            icon="bi-briefcase"
            trend={{ value: 'Active', direction: 'up' }}
          />
        </div>

        <div className="col-md-3">
          <KpiCard
            label="Hours Logged"
            value={personalStats?.totalHoursLogged ?? '0.00'}
            icon="bi-clock"
            trend={{ value: 'Cumulative', direction: 'up' }}
          />
        </div>

        <div className="col-md-3">
          <KpiCard
            label="Pending Timesheets"
            value={personalStats?.pendingTimesheetsCount ?? 0}
            icon="bi-file-earmark-text"
            trend={{ value: 'SOW Action', direction: 'warning' }}
          />
        </div>

        <div className="col-md-3">
          <div className="enterprise-kpi-card position-relative">
            <button
              onClick={toggleEarnings}
              className="border-0 bg-transparent p-0 text-muted position-absolute"
              style={{ top: '16px', right: '16px', cursor: 'pointer', outline: 'none' }}
              title={showTotalEarnings ? "Hide earnings" : "Show earnings"}
              aria-label={showTotalEarnings ? "Hide earnings" : "Show earnings"}
            >
              <i className={`bi ${showTotalEarnings ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '15px' }}></i>
            </button>
            <div className="kpi-card-header">
              <span className="kpi-card-label">Total Earnings</span>
            </div>
            <div className="kpi-card-body d-flex justify-content-between align-items-baseline" style={{ marginTop: '12px' }}>
              <h3 className={`kpi-card-number earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '160px', display: 'inline-block' }}>
                {displayEarnings
                  ? formatRupees(personalStats?.totalPaidAmount)
                  : '₹ ********'}
              </h3>
              {personalStats?.totalPaidAmount && (
                <span className="kpi-card-trend up">
                  <i className="bi bi-arrow-up-short"></i> Settled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Main Content Area */}
        <div className="col-lg-8 d-flex flex-column gap-4">
          {/* Current Assignment Details */}
          <div className="enterprise-table-container p-4">
            <h5 className="small fw-semibold text-uppercase text-muted mb-3">Current Active Assignment</h5>
            {currentAssignment ? (
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 bg-light rounded-3 h-100">
                    <p className="text-muted small mb-1">ROLE TITLE</p>
                    <h6 className="fw-bold text-dark mb-2">{currentAssignment.requisitionTitle || 'Contract Contractor'}</h6>
                    <span className="status-pill success">
                      {currentAssignment.status}
                    </span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 border rounded-3 h-100">
                    <div className="row g-2">
                      <div className="col-6">
                        <span className="text-muted small block">Manager</span>
                        <p className="fw-semibold text-dark small mb-0">{currentAssignment.hiringManagerName}</p>
                      </div>
                      <div className="col-6">
                        <span className="text-muted small block">Day Rate</span>
                        <p className={`fw-semibold text-success small mb-0 earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '100px', display: 'inline-block' }}>
                          {displayEarnings ? formatRupees(currentAssignment.agreedRatePerDay) : '₹ ********'}
                        </p>
                      </div>
                      <div className="col-6">
                        <span className="text-muted small block">Start Date</span>
                        <p className="fw-semibold text-dark small mb-0">{currentAssignment.startDate}</p>
                      </div>
                      <div className="col-6">
                        <span className="text-muted small block">End Date</span>
                        <p className="fw-semibold text-dark small mb-0">{currentAssignment.endDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-light rounded-3">
                <i className="bi bi-journal-x fs-2 text-muted"></i>
                <p className="text-muted small mt-2 mb-0">No active assignment found.</p>
              </div>
            )}
          </div>

          {/* Assignments Summary Grid */}
          <div className="enterprise-table-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="small fw-semibold text-uppercase text-muted mb-0">Assignment Placements</h5>
              <Link to="/contractor/assignments" className="text-decoration-none small fw-semibold text-primary">
                View All &rarr;
              </Link>
            </div>
            {allAssignments.length > 0 ? (
              <Table headers={['Role', 'Start Date', 'End Date', 'Rate', 'Status']}>
                {allAssignments.slice(0, 3).map((asn) => (
                  <tr key={asn.id}>
                    <td className="fw-semibold text-dark">{asn.requisitionTitle || 'Contractor'}</td>
                    <td>{asn.startDate}</td>
                    <td>{asn.endDate}</td>
                    <td className={`text-success fw-semibold text-end earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '120px' }}>
                      {displayEarnings ? `${formatRupees(asn.agreedRatePerDay)}/day` : '₹ ********'}
                    </td>
                    <td>
                      <span className={`status-pill ${asn.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                        {asn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-muted small mb-0 py-2">No placements logged.</p>
            )}
          </div>

          {/* Recent Timesheets Card */}
          <div className="enterprise-table-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="small fw-semibold text-uppercase text-muted mb-0">Recent Timesheets</h5>
              <Link to="/contractor/timesheets" className="text-decoration-none small fw-semibold text-primary">
                View All &rarr;
              </Link>
            </div>
            {recentTimesheets.length > 0 ? (
              <Table headers={['Week Period', 'Hours Logged', 'Overtime', 'Billable', 'Status']}>
                {recentTimesheets.slice(0, 3).map((ts) => (
                  <tr key={ts.id}>
                    <td className="fw-semibold text-dark">
                      {ts.weekStartDate} to {ts.weekEndDate}
                    </td>
                    <td>{ts.hoursLogged ?? '0.00'} hrs</td>
                    <td>{ts.overtimeLogged ?? '0.00'} hrs</td>
                    <td className={`text-success fw-semibold text-end earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '120px' }}>
                      {displayEarnings ? formatRupees(ts.billableAmount) : '₹ ********'}
                    </td>
                    <td>
                      <span className={`status-pill ${ts.status === 'APPROVED' ? 'success' : ts.status === 'SUBMITTED' ? 'info' : 'secondary'}`}>
                        {ts.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-muted small mb-0 py-2">No timesheets logged.</p>
            )}
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="col-lg-4 d-flex flex-column gap-4">
          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <div className="enterprise-table-container p-4">
              <h5 className="small fw-semibold text-uppercase text-muted mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-calendar-event"></i> Upcoming
              </h5>
              <div className="d-flex flex-column gap-3">
                {upcomingDeadlines.map((dl, idx) => (
                  <div key={idx} className="ps-2 position-relative">
                    <div className="position-absolute start-0 top-0 mt-1" style={{ color: 'var(--gf-primary)', fontSize: '1rem' }}>•</div>
                    <div className="ms-3">
                      <div className="small fw-semibold text-dark">{dl.title}</div>
                      <div className="text-muted small">{dl.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="enterprise-table-container p-4">
            <h5 className="small fw-semibold text-uppercase text-muted mb-3">Quick Actions</h5>
            <div className="d-flex flex-column gap-2">
              <button onClick={() => navigate('/contractor/timesheets')} className="btn-enterprise-secondary text-start py-3 px-3 d-flex gap-3 align-items-center">
                <i className="bi bi-clock fs-4 text-primary"></i>
                <div>
                  <div className="small fw-semibold text-dark">Fill Weekly Timesheet</div>
                  <div className="text-muted small">Log work details & submit logs</div>
                </div>
              </button>

              <button onClick={() => navigate('/contractor/profile')} className="btn-enterprise-secondary text-start py-3 px-3 d-flex gap-3 align-items-center">
                <i className="bi bi-person fs-4 text-primary"></i>
                <div>
                  <div className="small fw-semibold text-dark">Update Profile Details</div>
                  <div className="text-muted small">Modify experience & skills</div>
                </div>
              </button>

              <button onClick={() => navigate('/contractor/assignments')} className="btn-enterprise-secondary text-start py-3 px-3 d-flex gap-3 align-items-center">
                <i className="bi bi-clipboard-check fs-4 text-primary"></i>
                <div>
                  <div className="small fw-semibold text-dark">View Placements</div>
                  <div className="text-muted small">Check SOW & agreed rates</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="enterprise-table-container p-4">
            <h5 className="small fw-semibold text-uppercase text-muted mb-3">Recent Activity</h5>
            {activities.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {activities.map((act) => (
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
  );
}

export default Dashboard;

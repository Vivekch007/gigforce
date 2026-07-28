import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Alert, Button, Card } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getAdminDashboardMetrics } from '../../services/adminDashboardService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import ActivityTimeline from '../../components/admin/ActivityTimeline';
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);


  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">System Dashboard</h2>
        <p className="text-muted small mt-1 mb-0">Monitor platform health metrics, audit administrative updates, and configure global variables.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying dashboard metrics..." />
      ) : (
        <div>
          {/* KPI Metrics Row */}
          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-9 g-3 mb-4">
            <div className="col">
              <AdminMetricCard title="Total Users" value={metrics?.totalUsers} desc="All roles registered" borderStartClass="border-start border-4 border-primary" />
            </div>
            <div className="col">
              <AdminMetricCard title="Active Users" value={metrics?.activeUsers} desc="Not suspended" borderStartClass="border-start border-4 border-success" />
            </div>
            <div className="col">
              <AdminMetricCard title="Contractors" value={metrics?.contractorsCount} desc="Onboarded contractors" borderStartClass="border-start border-4 border-warning" />
            </div>
            <div className="col">
              <AdminMetricCard title="Vendors" value={metrics?.vendorsCount} desc="Staffing suppliers" borderStartClass="border-start border-4 border-info" />
            </div>
            <div className="col">
              <AdminMetricCard title="Hiring Mgrs" value={metrics?.managersCount} desc="Client managers" borderStartClass="border-start border-4 border-dark" />
            </div>
            <div className="col">
              <AdminMetricCard title="Finance" value={metrics?.financeCount} desc="Ledger processors" borderStartClass="border-start border-4 border-danger" />
            </div>
            <div className="col">
              <AdminMetricCard title="Org Units" value={metrics?.totalOrgUnits} desc="Distinct org units" borderStartClass="border-start border-4 border-primary" />
            </div>
            <div className="col">
              <AdminMetricCard title="Total Skills" value={metrics?.totalSkills} desc="Master catalogs" borderStartClass="border-start border-4 border-success" />
            </div>
            <div className="col">
              <AdminMetricCard title="Open Requisitions" value={metrics?.healthMetrics?.openRequisitions} desc="Awaiting fulfillment" borderStartClass="border-start border-4 border-warning" />
            </div>
          </div>

          <Row className="g-4 mb-4">
            {/* Quick Actions & System Health */}
            <Col lg={8}>
              <Card className="gf-card p-4 border-0 mb-4 bg-white">
                <h5 className="fw-bold mb-3 text-slate-800">Administrative Tasks</h5>
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="outline-primary" className="py-2 px-3 flex-grow-1" onClick={() => navigate('/admin/users')}>
                    👤 Create User Account
                  </Button>

                  <Button variant="outline-primary" className="py-2 px-3 flex-grow-1" onClick={() => navigate('/admin/organizations')}>
                    🏢 Register Tenant Organization
                  </Button>
                  <Button className="btn-gf-primary py-2 px-3 flex-grow-1" onClick={() => navigate('/admin/audit-logs')}>
                    📜 Review Audit Trails
                  </Button>
                </div>
              </Card>

              {/* Health widgets */}
              <Card className="gf-card p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800">🖥️ Platform Environment Health</h5>
                <Row className="g-3 text-center">
                  <Col md={3}>
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">Active Assignments</span>
                      <h4 className="fw-black text-slate-800 mb-0">{metrics?.healthMetrics?.activeAssignments}</h4>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">API Endpoint</span>
                      <span className="badge bg-success mt-1">HEALTHY</span>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">Database Conn</span>
                      <span className="badge bg-success mt-1">CONNECTED</span>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">Inactive / Suspended</span>
                      <h4 className="fw-black text-slate-800 mb-0">{(metrics?.totalUsers ?? 0) - (metrics?.activeUsers ?? 0)}</h4>
                    </div>
                  </Col>
                </Row>

              </Card>
            </Col>

            {/* Recent Timeline activity */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0 bg-white h-100">
                <h5 className="fw-bold mb-3 text-slate-800">📜 Recent Administration Activities</h5>
                <ActivityTimeline activities={metrics?.recentLogs} />
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

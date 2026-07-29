import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Alert } from 'react-bootstrap';
import { getAdminDashboardMetrics } from '../../services/adminDashboardService';
import { getErrorMessage } from '../../services/errorUtils';
import ActivityTimeline from '../../components/admin/ActivityTimeline';
import Loader from '../../components/Loader';
import KpiCard from '../../components/KpiCard';

function Dashboard() {
  const navigate = useNavigate();
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
    <div>
      {/* Welcome Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">System Dashboard</h1>
        <p className="muted-text">Monitor platform health metrics, audit administrative updates, and configure global variables.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger">{error}</Alert>}

      {loading ? (
        <Loader message="Querying dashboard metrics..." />
      ) : (
        <div>
          {/* Quick Actions Panel */}
          <div className="enterprise-table-container p-4 mb-4">
            <h5 className="small fw-semibold text-uppercase text-muted mb-3">Quick Administrative Actions</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <button className="btn-enterprise-secondary w-100 justify-content-center py-3" onClick={() => navigate('/admin/users')}>
                   View Users List
                </button>
              </div>
              <div className="col-md-4">
                <button className="btn-enterprise-secondary w-100 justify-content-center py-3" onClick={() => navigate('/admin/organizations')}>
                   View Organization List
                </button>
              </div>
              {/* <div className="col-md-4">
                <button className="btn-enterprise-primary w-100 justify-content-center py-3" onClick={() => navigate('/admin/audit-logs')}>
                  <i className="bi bi-file-earmark-text me-2"></i> Review Audit Trails
                </button>
              </div> */}
            </div>
          </div>

          {/* KPI Metrics Row using our shared KpiCard */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <KpiCard
                label="Total Platform Users"
                value={metrics?.totalUsers}
                icon="bi-people"
                trend={{ value: 'Active', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Active Placements"
                value={metrics?.healthMetrics?.activeAssignments}
                icon="bi-briefcase"
                trend={{ value: 'Live', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Open Requisitions"
                value={metrics?.healthMetrics?.openRequisitions}
                icon="bi-file-earmark-plus"
                trend={{ value: 'Open', direction: 'warning' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Tenant Organizations"
                value={metrics?.totalOrgUnits}
                icon="bi-building"
                trend={{ value: 'Tenants', direction: 'up' }}
              />
            </div>
          </div>

          <Row className="g-4">
            {/* System Health */}
            <Col lg={8}>
              <div className="enterprise-table-container p-4 h-100">
                <h5 className="small fw-semibold text-uppercase text-muted mb-4"><i className="bi bi-display me-2"></i>Platform Environment Health</h5>
                <Row className="g-3">
                  <Col sm={6}>
                    <div className="p-3 border rounded-3 bg-light">
                      <span className="small text-muted text-uppercase fw-semibold d-block mb-1">Contractor Profiles</span>
                      <h4 className="fw-bold mb-0 text-dark">{metrics?.contractorsCount}</h4>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="p-3 border rounded-3 bg-light">
                      <span className="small text-muted text-uppercase fw-semibold d-block mb-1">Staffing Vendors</span>
                      <h4 className="fw-bold mb-0 text-dark">{metrics?.vendorsCount}</h4>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="p-3 border rounded-3 bg-light">
                      <span className="small text-muted text-uppercase fw-semibold d-block mb-1">Tenant Administrators</span>
                      <h4 className="fw-bold mb-0 text-dark">{metrics?.activeUsers}</h4>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Recent Timeline activity */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4 h-100">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3"><i className="bi bi-clock-history me-2"></i>Recent Administrative Logs</h5>
                <ActivityTimeline activities={metrics?.recentLogs} />
              </div>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

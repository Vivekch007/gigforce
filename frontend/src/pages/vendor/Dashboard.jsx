import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Alert } from 'react-bootstrap';
import { getVendorDashboardMetrics } from '../../services/vendorDashboardService';
import { getCandidates } from '../../services/candidateService';
import { getRequisitions } from '../../services/vendorRequisitionService';
import { getAssignments } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import ActivityTimeline from '../../components/vendor/ActivityTimeline';
import KpiCard from '../../components/KpiCard';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  const [searchResults, setSearchResults] = useState({
    candidates: [],
    requisitions: [],
    assignments: [],
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getVendorDashboardMetrics();
      setMetrics(data);

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        
        const [cands, reqsData, asns] = await Promise.all([
          getCandidates().catch(() => []),
          getRequisitions({ size: 100 }).catch(() => ({ content: [] })),
          getAssignments().catch(() => []),
        ]);

        const reqs = reqsData?.content || [];

        const filteredCands = cands.filter(c => 
          c.name.toLowerCase().includes(query) || 
          c.skills.toLowerCase().includes(query)
        );

        const filteredReqs = reqs.filter(r => 
          r.title?.toLowerCase().includes(query) || 
          r.clientName?.toLowerCase().includes(query)
        );

        const filteredAsns = asns.filter(a => 
          a.contractorName?.toLowerCase().includes(query) || 
          a.requisitionTitle?.toLowerCase().includes(query)
        );

        setSearchResults({
          candidates: filteredCands,
          requisitions: filteredReqs,
          assignments: filteredAsns,
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

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">Vendor Portal</h1>
        <p className="muted-text">Overview of active requisitions, staffing pipelines, and billing contracts.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Assembling metrics..." />
      ) : searchQuery.trim() ? (
        /* Global Search Panel */
        <div>
          <div className="enterprise-alert enterprise-alert-success py-2 mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-search text-success"></i>
            <span>Showing search results for: <strong>"{searchQuery}"</strong></span>
          </div>

          <Row className="g-4">
            {/* Candidates */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Matching Candidates ({searchResults.candidates.length})</h5>
                {searchResults.candidates.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.candidates.map(c => (
                      <div key={c.id} className="p-3 border rounded-3 bg-light">
                        <div className="small fw-bold text-dark">{c.name}</div>
                        <div className="text-muted small mt-1">{c.skills} &bull; {c.experience} yrs</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching candidates found.</p>
                )}
              </div>
            </Col>

            {/* Requisitions */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Matching Open Jobs ({searchResults.requisitions.length})</h5>
                {searchResults.requisitions.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.requisitions.map(r => (
                      <div key={r.id} className="p-3 border rounded-3 bg-light">
                        <div className="small fw-bold text-dark">{r.title}</div>
                        <div className="text-muted small mt-1">{r.clientName} &bull; {r.experienceLevel}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching open requisitions found.</p>
                )}
              </div>
            </Col>

            {/* Assignments */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Matching Placements ({searchResults.assignments.length})</h5>
                {searchResults.assignments.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.assignments.map(a => (
                      <div key={a.id} className="p-3 border rounded-3 bg-light">
                        <div className="small fw-bold text-dark">{a.contractorName}</div>
                        <div className="text-muted small mt-1">{a.requisitionTitle} &bull; {a.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching placements found.</p>
                )}
              </div>
            </Col>
          </Row>
        </div>
      ) : (
        /* Normal Dashboard View */
        <div>
          {/* Quick Actions Panel */}
          <div className="enterprise-table-container p-4 mb-4">
            <h5 className="small fw-semibold text-uppercase text-muted mb-3">Quick Actions</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <button className="btn-enterprise-secondary w-100 justify-content-center py-3" onClick={() => navigate('/vendor/candidates')}>
                  <i className="bi bi-person-plus me-2"></i> Add Candidate
                </button>
              </div>
              <div className="col-md-4">
                <button className="btn-enterprise-secondary w-100 justify-content-center py-3" onClick={() => navigate('/vendor/requisitions')}>
                  <i className="bi bi-clipboard-plus me-2"></i> Submit Candidate
                </button>
              </div>
              <div className="col-md-4">
                <button className="btn-enterprise-primary w-100 justify-content-center py-3" onClick={() => navigate('/vendor/purchase-orders')}>
                  <i className="bi bi-file-earmark-plus me-2"></i> Create Purchase Order
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <KpiCard
                label="Open Requisitions"
                value={metrics?.openReqs || 0}
                icon="bi-journal-list"
                trend={{ value: 'Sourcing', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Placements Filled"
                value={metrics?.activeAssignments || 0}
                icon="bi-people"
                trend={{ value: 'Active', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Selection Rate"
                value={metrics?.scorecard ? `${metrics.scorecard.selectionRate}%` : '0%'}
                icon="bi-percent"
                trend={{ value: 'Avg Ratio', direction: 'warning' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Total Revenue"
                value={`₹ ${metrics?.scorecard ? Math.round(metrics.scorecard.totalRevenueGenerated).toLocaleString('en-IN') : '0'}`}
                icon="bi-wallet2"
                trend={{ value: 'Settled', direction: 'up' }}
              />
            </div>
          </div>

          <Row className="g-4">
            {/* Left side: upcoming interviews */}
            <Col lg={8}>
              {/* Upcoming Interviews */}
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3"><i className="bi bi-calendar-event me-2"></i>Upcoming Interview Calendars</h5>
                {metrics?.upcomingInterviews?.length > 0 ? (
                  <div className="row g-3">
                    {metrics.upcomingInterviews.map(i => (
                      <div className="col-md-6" key={i.id}>
                        <div className="p-3 border rounded-3 bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small fw-bold text-dark">{i.candidateName}</span>
                            <span className="status-pill success">{i.status}</span>
                          </div>
                          <div className="text-muted small mb-2">{i.position} &bull; {i.clientName}</div>
                          <span className="text-dark small"><i className="bi bi-clock me-1"></i> {i.date} @ {i.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0 py-2">No interviews scheduled today.</p>
                )}
              </div>
            </Col>

            {/* Right side: Activity Timeline */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4 h-100">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3"><i className="bi bi-activity me-2"></i>Recent Portal Activity</h5>
                <ActivityTimeline activities={metrics?.recentActivities} />
              </div>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

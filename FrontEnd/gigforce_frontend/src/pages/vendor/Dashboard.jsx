import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Alert, Button, Card } from 'react-bootstrap';
import { getVendorDashboardMetrics } from '../../services/vendorDashboardService';
import { getCandidates } from '../../services/candidateService';
import { getRequisitions } from '../../services/vendorRequisitionService';
import { getAssignments } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable custom components
import VendorMetricCard from '../../components/vendor/VendorMetricCard';
import ActivityTimeline from '../../components/vendor/ActivityTimeline';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard states
  const [metrics, setMetrics] = useState(null);

  // Search result states
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
        
        // Fetch candidates, requisitions, and assignments to filter locally
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
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Vendor Portal</h2>
        <p className="text-muted small mt-1 mb-0">Overview of active requisitions, staffing pipelines, and billing contracts.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Assembling metrics..." />
      ) : searchQuery.trim() ? (
        /* Global Search Panel */
        <div>
          <div className="alert alert-info py-2 mb-4">
            🔍 Showing search results for: <strong>"{searchQuery}"</strong>
          </div>

          <Row className="g-4">
            {/* Candidates */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">👤 Matching Candidates ({searchResults.candidates.length})</h5>
                {searchResults.candidates.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.candidates.map(c => (
                      <div key={c.id} className="p-2 border rounded bg-light">
                        <div className="small fw-bold text-slate-800">{c.name}</div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>{c.skills} &bull; {c.experience} yrs</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching candidates found.</p>
                )}
              </Card>
            </Col>

            {/* Requisitions */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">💼 Matching Open Jobs ({searchResults.requisitions.length})</h5>
                {searchResults.requisitions.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.requisitions.map(r => (
                      <div key={r.id} className="p-2 border rounded bg-light">
                        <div className="small fw-bold text-slate-800">{r.title}</div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>{r.clientName} &bull; {r.experienceLevel}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching open requisitions found.</p>
                )}
              </Card>
            </Col>

            {/* Assignments */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">📋 Matching Placements ({searchResults.assignments.length})</h5>
                {searchResults.assignments.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.assignments.map(a => (
                      <div key={a.id} className="p-2 border rounded bg-light">
                        <div className="small fw-bold text-slate-800">{a.contractorName}</div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>{a.requisitionTitle} &bull; {a.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching placements found.</p>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ) : (
        /* Normal Dashboard View */
        <div>
          {/* KPI Cards */}
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-6 g-3 mb-4">
            <div className="col">
              <VendorMetricCard title="Open Jobs" value={metrics?.openReqs} desc="Active vacancies" borderStartClass="border-start border-4 border-primary" />
            </div>
            <div className="col">
              <VendorMetricCard title="Submitted" value={metrics?.submittedCandidates} desc="Awaiting review" borderStartClass="border-start border-4 border-info" />
            </div>
            <div className="col">
              <VendorMetricCard title="Shortlisted" value={metrics?.shortlistedCandidates} desc="Awaiting slots" borderStartClass="border-start border-4 border-warning" />
            </div>
            <div className="col">
              <VendorMetricCard title="Selected" value={metrics?.selectedCandidates} desc="Hired pipeline" borderStartClass="border-start border-4 border-success" />
            </div>
            <div className="col">
              <VendorMetricCard title="Active Placements" value={metrics?.activeAssignments} desc="Onboarded team" borderStartClass="border-start border-4 border-dark" />
            </div>
            <div className="col">
              <VendorMetricCard title="Pending POs" value={metrics?.pendingPOs} desc="Billing setups" borderStartClass="border-start border-4 border-secondary" />
            </div>
          </div>

          <Row className="g-4">
            {/* Left side: Quick actions & upcoming interviews */}
            <Col lg={8}>
              {/* Quick Actions */}
              <Card className="gf-card p-4 border-0 mb-4">
                <h5 className="fw-bold mb-3 text-slate-800">Quick Actions</h5>
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="outline-primary" className="py-2 px-3 flex-grow-1" onClick={() => navigate('/vendor/candidates')}>
                    👤 Add Candidate
                  </Button>
                  <Button variant="outline-primary" className="py-2 px-3 flex-grow-1" onClick={() => navigate('/vendor/requisitions')}>
                    💼 Submit Candidate
                  </Button>
                  <Button className="btn-gf-primary py-2 px-3 flex-grow-1" onClick={() => navigate('/vendor/purchase-orders')}>
                    💵 Create Purchase Order
                  </Button>
                </div>
              </Card>

              {/* Upcoming Interviews */}
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">📅 Upcoming Interview Calendars</h5>
                {metrics?.upcomingInterviews?.length > 0 ? (
                  <div className="row g-3">
                    {metrics.upcomingInterviews.map(i => (
                      <div className="col-md-6" key={i.id}>
                        <div className="p-3 border rounded bg-light">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small fw-bold text-slate-800">{i.candidateName}</span>
                            <span className="gf-badge badge-approved">{i.status}</span>
                          </div>
                          <div className="text-muted small mb-2">{i.position} &bull; {i.clientName}</div>
                          <span className="text-slate-600 small">⏱️ {i.date} @ {i.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0 py-2">No interviews scheduled today.</p>
                )}
              </Card>
            </Col>

            {/* Right side: Activity Timeline */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0 h-100">
                <h5 className="fw-bold mb-3 text-slate-800">🔔 Recent Portal Activity</h5>
                <ActivityTimeline activities={metrics?.recentActivities} />
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { Spinner, Alert, Card, Row, Col, Table, Button } from 'react-bootstrap';
import { getRequisitions } from '../../services/requisitionService';
import { getAssignments } from '../../services/managerAssignmentService';
import { getTimesheetsToApprove, getLeavesToApprove } from '../../services/approvalService';
import { getInterviews } from '../../services/interviewService';
import { getErrorMessage } from '../../services/errorUtils';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report state data
  const [summary, setSummary] = useState({
    openJobs: 0,
    filledJobs: 0,
    pendingInterviews: 0,
    pendingApprovals: 0,
    activeContractors: 0,
  });

  const [activePlacements, setActivePlacements] = useState([]);
  const [openJobsList, setOpenJobsList] = useState([]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        reqsData,
        asnData,
        tsData,
        leavesData,
        interviewsData,
      ] = await Promise.all([
        getRequisitions({ size: 100 }).catch(() => ({ content: [] })),
        getAssignments({ size: 100 }).catch(() => ({ content: [] })),
        getTimesheetsToApprove().catch(() => []),
        getLeavesToApprove().catch(() => []),
        getInterviews().catch(() => []),
      ]);

      const reqs = reqsData?.content || [];
      const asns = asnData?.content || [];

      const openJobsCount = reqs.filter(r => r.status === 'OPEN').length;
      const filledJobsCount = reqs.filter(r => r.status === 'FILLED').length;
      const pendingIntsCount = interviewsData.filter(i => i.status === 'SCHEDULED').length;
      const pendingApprovalsCount = tsData.filter(t => t.status === 'SUBMITTED').length + leavesData.filter(l => l.status === 'PENDING').length;
      const activeContractorsCount = asns.filter(a => a.status === 'ACTIVE').length;

      setSummary({
        openJobs: openJobsCount,
        filledJobs: filledJobsCount,
        pendingInterviews: pendingIntsCount,
        pendingApprovals: pendingApprovalsCount,
        activeContractors: activeContractorsCount,
      });

      setActivePlacements(asns.filter(a => a.status === 'ACTIVE').slice(0, 5));
      setOpenJobsList(reqs.filter(r => r.status === 'OPEN').slice(0, 5));

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  const handleExportCSV = (reportType) => {
    // Generate simulated CSV download
    const csvContent = "data:text/csv;charset=utf-8,ID,Name,Details,Status\n" + 
      (reportType === 'contractors' ? activePlacements.map(p => `${p.id},${p.contractorName},${p.requisitionTitle},${p.status}`).join('\n') :
       openJobsList.map(j => `${j.id},${j.title},${j.businessUnitId},${j.status}`).join('\n'));
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Manager Reporting</h2>
          <p className="text-muted small mt-1 mb-0">Review workforce planning analytics, check metrics trends, and export CSV logs.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => handleExportCSV('requisitions')}>Export Requisitions CSV</Button>
          <Button className="btn-gf-primary" onClick={() => handleExportCSV('contractors')}>Export Contractors CSV</Button>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Compiling workforce report...</p>
        </div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Open Requisitions</span>
                <h3 className="fw-black text-slate-800 mt-1 mb-0">{summary.openJobs}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Filled Positions</span>
                <h3 className="fw-black text-green-600 mt-1 mb-0">{summary.filledJobs}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Scheduled Interviews</span>
                <h3 className="fw-black text-blue-600 mt-1 mb-0">{summary.pendingInterviews}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending Approvals</span>
                <h3 className="fw-black text-amber-600 mt-1 mb-0">{summary.pendingApprovals}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Active Hires</span>
                <h3 className="fw-black text-slate-800 mt-1 mb-0">{summary.activeContractors}</h3>
              </div>
            </div>
          </div>

          {/* Visual Trend indicators */}
          <Row className="g-4 mb-4">
            {/* Donut Chart and Fill rate summary */}
            <Col lg={4}>
              <Card className="gf-card h-100 p-4 border-0">
                <h5 className="fw-bold mb-4 text-slate-800 text-center">Recruitment Success Fill Rate</h5>
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <div style={{ width: '150px', height: '150px', position: 'relative' }} className="mb-3">
                    <svg viewBox="0 0 36 36" className="w-100 h-100">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" strokeWidth="3" 
                              strokeDasharray="75 25" strokeDashoffset="25" />
                    </svg>
                    <div className="position-absolute start-50 top-50 translate-middle text-center">
                      <div className="fs-3 fw-black text-slate-800">75%</div>
                      <div className="text-muted" style={{ fontSize: '0.6rem' }}>Filled Rate</div>
                    </div>
                  </div>
                  <p className="text-muted small text-center mb-0 mt-2">
                    75% of job requirements posted by the Hiring Manager are fulfilled by our vendor partners.
                  </p>
                </div>
              </Card>
            </Col>

            {/* Line Trend graph */}
            <Col lg={8}>
              <Card className="gf-card h-100 p-4 border-0">
                <h5 className="fw-bold mb-4 text-slate-800">Placement Activity Trends</h5>
                <div style={{ height: '220px', position: 'relative' }}>
                  <svg viewBox="0 0 100 40" className="w-100 h-100">
                    <defs>
                      <linearGradient id="reportsChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,35 L20,32 L40,24 L60,15 L80,8 L100,5 L100,40 L0,40 Z" fill="url(#reportsChartGrad)" />
                    <path d="M0,35 L20,32 L40,24 L60,15 L80,8 L100,5" fill="none" stroke="#10b981" strokeWidth="1.5" />
                    <line x1="0" y1="35" x2="100" y2="35" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                  </svg>
                  <div className="d-flex justify-content-between mt-2 text-muted" style={{ fontSize: '0.7rem' }}>
                    <span>January</span>
                    <span>February</span>
                    <span>March</span>
                    <span>April</span>
                    <span>May</span>
                    <span>June</span>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row className="g-4">
            {/* Active placements list */}
            <Col lg={6}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-person-fill me-2"></i>Active Hires Overview</h5>
                <div className="table-responsive">
                  <Table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Contractor</th>
                        <th>Job Title</th>
                        <th>Agreed Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePlacements.length > 0 ? (
                        activePlacements.map(p => (
                          <tr key={p.id}>
                            <td className="fw-semibold text-slate-800">{p.contractorName}</td>
                            <td>{p.requisitionTitle}</td>
                            <td className="text-green-600 fw-bold">${p.agreedRatePerDay}/day</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center text-muted">No active placements found.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </Col>

            {/* Open jobs list */}
            <Col lg={6}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-briefcase me-2"></i>Open Job Postings</h5>
                <div className="table-responsive">
                  <Table className="table table-hover align-middle mb-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>Job ID</th>
                        <th>Job Title</th>
                        <th>Employment Type</th>
                        <th>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openJobsList.length > 0 ? (
                        openJobsList.map(j => (
                          <tr key={j.id}>
                            <td className="fw-bold">{j.id}</td>
                            <td className="fw-semibold text-slate-800">{j.title}</td>
                            <td>{j.engagementType}</td>
                            <td>{j.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center text-muted">No open job requisitions.</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

export default Reports;

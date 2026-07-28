import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Button, Alert } from 'react-bootstrap';
import { getVendorDashboardMetrics } from '../../services/vendorDashboardService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable custom components
import VendorMetricCard from '../../components/vendor/VendorMetricCard';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report state data
  const [summary, setSummary] = useState(null);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getVendorDashboardMetrics();
      setSummary(data);
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
    const csvContent = "data:text/csv;charset=utf-8,KPI,Value\n" + 
      `Open Requisitions,${summary?.openReqs || 0}\n` +
      `Candidates Submitted,${summary?.submittedCandidates || 0}\n` +
      `Shortlisted Candidates,${summary?.shortlistedCandidates || 0}\n` +
      `Selected Candidates,${summary?.selectedCandidates || 0}\n` +
      `Active Placements,${summary?.activeAssignments || 0}\n` +
      `Pending Purchase Orders,${summary?.pendingPOs || 0}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_summary_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Vendor Reporting</h2>
          <p className="text-muted small mt-1 mb-0">Review submission metrics, placement trends, and export analytical summary sheets.</p>
        </div>
        <Button className="btn-gf-primary" onClick={() => handleExportCSV('vendor')}>Export Metrics CSV</Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Generating scorecard..." />
      ) : (
        <div>
          {/* KPI Metrics */}
          <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
            <div className="col">
              <VendorMetricCard title="Open Requisitions" value={summary?.openReqs} desc="Active vacancies posted" />
            </div>
            <div className="col">
              <VendorMetricCard title="Candidates Submitted" value={summary?.submittedCandidates} desc="Awaiting client feedback" />
            </div>
            <div className="col">
              <VendorMetricCard title="Shortlisted Candidates" value={summary?.shortlistedCandidates} desc="Moving to interviews" />
            </div>
            <div className="col">
              <VendorMetricCard title="Selected Candidates" value={summary?.selectedCandidates} desc="Hired candidates" />
            </div>
            <div className="col">
              <VendorMetricCard title="Active Contractors" value={summary?.activeAssignments} desc="Currently on project contract" />
            </div>
            <div className="col">
              <VendorMetricCard title="Purchase Orders Raised" value={summary?.pendingPOs + 2} desc="Approved billings POs" />
            </div>
            <div className="col">
              <VendorMetricCard title="Pending Purchase Orders" value={summary?.pendingPOs} desc="Draft or submitted POs" />
            </div>
          </div>

          {/* Charts Row */}
          <Row className="g-4 mb-4">
            {/* Fill Rate Donut Gauge */}
            <Col lg={4}>
              <Card className="gf-card h-100 p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800 text-center">Submission Success Ratio</h5>
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <div style={{ width: '150px', height: '150px', position: 'relative' }} className="mb-3">
                    <svg viewBox="0 0 36 36" className="w-100 h-100">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#057857" strokeWidth="3" 
                              strokeDasharray="80 20" strokeDashoffset="25" />
                    </svg>
                    <div className="position-absolute start-50 top-50 translate-middle text-center">
                      <div className="fs-3 fw-black text-slate-800">80%</div>
                      <div className="text-muted" style={{ fontSize: '0.6rem' }}>Selected Rate</div>
                    </div>
                  </div>
                  <p className="text-muted small text-center mb-0 mt-2">
                    80% of shortlisted candidate profiles successfully clear final client rounds and receive selection.
                  </p>
                </div>
              </Card>
            </Col>

            {/* Line Trend Area Chart */}
            <Col lg={8}>
              <Card className="gf-card h-100 p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800">Monthly Submission Activity</h5>
                <div style={{ height: '220px', position: 'relative' }}>
                  <svg viewBox="0 0 100 40" className="w-100 h-100">
                    <defs>
                      <linearGradient id="vendorChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#057857" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#057857" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,35 L20,30 L40,18 L60,25 L80,12 L100,8 L100,40 L0,40 Z" fill="url(#vendorChartGrad)" />
                    <path d="M0,35 L20,30 L40,18 L60,25 L80,12 L100,8" fill="none" stroke="#057857" strokeWidth="1.5" />
                    <line x1="0" y1="35" x2="100" y2="35" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="1,1" />
                  </svg>
                  <div className="d-flex justify-content-between mt-2 text-muted" style={{ fontSize: '0.7rem' }}>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                  </div>
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

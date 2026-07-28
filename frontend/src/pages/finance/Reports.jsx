import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Alert, Button } from 'react-bootstrap';
import { getFinanceDashboardMetrics } from '../../services/financeDashboardService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import FinanceMetricCard from '../../components/finance/FinanceMetricCard';
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Scorecard data
  const [scorecard, setScorecard] = useState(null);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFinanceDashboardMetrics();
      setScorecard(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleExportCSV = (reportType) => {
    const csvContent = "data:text/csv;charset=utf-8,KPI,Value\n" +
      `Pending Purchase Orders,${scorecard?.pendingPOs || 0}\n` +
      `Invoices Ready,${scorecard?.invoicesReady || 0}\n` +
      `Payments Pending,${scorecard?.paymentsPending || 0}\n` +
      `Payments Completed,${scorecard?.paymentsCompleted || 0}\n` +
      `Total Invoice Value,${scorecard?.totalInvoiceValue || 0}\n` +
      `Total Payments Disbursed,${scorecard?.totalPayments || 0}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_ledger_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Financial Reports</h2>
          <p className="text-muted small mt-1 mb-0">Review disbursement analytics, check billing distributions, and download audit sheets.</p>
        </div>
        <Button className="btn-gf-primary" onClick={() => handleExportCSV('finance')}>Export Financial CSV</Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Generating cash accounts reports..." />
      ) : (
        <div>
          {/* KPI Metrics */}
          <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
            <div className="col">
              <FinanceMetricCard title="Total POs Reviewing" value={scorecard?.pendingPOs + 5} desc="Purchase orders logged" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Total Invoices" value={scorecard?.invoicesReady + 3} desc="Aggregated client billings" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Pending Payments" value={scorecard?.paymentsPending} desc="Awaiting bank release" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Completed Payments" value={scorecard?.paymentsCompleted} desc="Paid transactions reconciled" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Monthly Invoice Value" value={`$${Math.round(scorecard?.totalInvoiceValue || 0).toLocaleString()}`} desc="Total invoiced value" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Monthly Payment Value" value={`$${Math.round(scorecard?.totalPayments || 0).toLocaleString()}`} desc="Total payouts value" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Outstanding Payments" value={`$${Math.round(scorecard?.outstandingAmount || 0).toLocaleString()}`} desc="Unsettled approved billings" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Payment Success Rate" value="98.5%" desc="ACH/Wire successful rate" />
            </div>
          </div>

          {/* SVG Charts */}
          <Row className="g-4 mb-4">
            {/* Donut Chart: Invoice Status Distribution */}
            <Col lg={4}>
              <Card className="gf-card h-100 p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800 text-center">Invoice Clearance Ratios</h5>
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <div style={{ width: '150px', height: '150px', position: 'relative' }} className="mb-3">
                    <svg viewBox="0 0 36 36" className="w-100 h-100">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#4f46e5" strokeWidth="3" 
                              strokeDasharray="90 10" strokeDashoffset="25" />
                    </svg>
                    <div className="position-absolute start-50 top-50 translate-middle text-center">
                      <div className="fs-3 fw-black text-slate-800">90%</div>
                      <div className="text-muted" style={{ fontSize: '0.6rem' }}>Clearance Rate</div>
                    </div>
                  </div>
                  <p className="text-muted small text-center mb-0 mt-2">
                    90% of approved invoices are processed and settled within the standard 30-day net payment period.
                  </p>
                </div>
              </Card>
            </Col>

            {/* Line Trend: Payment trends */}
            <Col lg={8}>
              <Card className="gf-card h-100 p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800">Payment Outflow Trends</h5>
                <div style={{ height: '220px', position: 'relative' }}>
                  <svg viewBox="0 0 100 40" className="w-100 h-100">
                    <defs>
                      <linearGradient id="financeChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,35 L20,32 L40,22 L60,14 L80,18 L100,5 L100,40 L0,40 Z" fill="url(#financeChartGrad)" />
                    <path d="M0,35 L20,32 L40,22 L60,14 L80,18 L100,5" fill="none" stroke="#4f46e5" strokeWidth="1.5" />
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

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
              <FinanceMetricCard title="Pending Purchase Orders" value={scorecard?.pendingPOs || 0} desc="Purchase orders logged" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Invoices Ready" value={scorecard?.invoicesReady || 0} desc="Aggregated client billings" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Pending Payments" value={scorecard?.paymentsPending || 0} desc="Awaiting bank release" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Completed Payments" value={scorecard?.paymentsCompleted || 0} desc="Paid transactions reconciled" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Total Invoice Value" value={`$${Math.round(scorecard?.totalInvoiceValue || 0).toLocaleString()}`} desc="Total invoiced value" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Total Payments Disbursed" value={`$${Math.round(scorecard?.totalPayments || 0).toLocaleString()}`} desc="Total payouts value" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Outstanding Payments" value={`$${Math.round(scorecard?.outstandingAmount || 0).toLocaleString()}`} desc="Unsettled approved billings" />
            </div>
            <div className="col">
              <FinanceMetricCard
                title="Payment Success Rate"
                value={(() => {
                  const paid = scorecard?.paymentSummary?.paid || 0;
                  const failed = scorecard?.paymentSummary?.failed || 0;
                  const total = paid + failed;
                  return total > 0 ? `${Math.round((paid / total) * 100)}%` : 'N/A';
                })()}
                desc="Paid vs. failed disbursements"
              />
            </div>
          </div>

          {/* Payment Status Breakdown */}
          <Card className="gf-card p-4 border-0 bg-white">
            <h5 className="fw-bold mb-3 text-slate-800">Payment Status Breakdown</h5>
            <Row className="g-3">
              <Col md={4}>
                <div className="p-3 rounded border">
                  <div className="text-muted small">Pending</div>
                  <div className="fs-4 fw-bold text-dark">{scorecard?.paymentSummary?.pending || 0}</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3 rounded border">
                  <div className="text-muted small">Paid</div>
                  <div className="fs-4 fw-bold text-success">{scorecard?.paymentSummary?.paid || 0}</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3 rounded border">
                  <div className="text-muted small">Failed</div>
                  <div className="fs-4 fw-bold text-danger">{scorecard?.paymentSummary?.failed || 0}</div>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Reports;

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Alert } from 'react-bootstrap';
import { getFinanceDashboardMetrics } from '../../services/financeDashboardService';
import { getPurchaseOrders } from '../../services/financePurchaseOrderService';
import { getInvoices } from '../../services/invoiceService';
import { getPayments } from '../../services/paymentService';
import { getErrorMessage } from '../../services/errorUtils';
import { formatINR } from '../../utils/currency';
import ActivityTimeline from '../../components/finance/ActivityTimeline';
import KpiCard from '../../components/KpiCard';
import Loader from '../../components/Loader';

function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  const [searchResults, setSearchResults] = useState({
    purchaseOrders: [],
    invoices: [],
    payments: [],
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFinanceDashboardMetrics();
      setMetrics(data);

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();

        const [pos, invoices, payments] = await Promise.all([
          getPurchaseOrders().catch(() => []),
          getInvoices().catch(() => []),
          getPayments().catch(() => []),
        ]);

        const filteredPOs = pos.filter(po => 
          po.id?.toLowerCase().includes(query) ||
          po.status?.toLowerCase().includes(query)
        );

        const filteredInvoices = invoices.filter(inv => 
          inv.invoiceNumber?.toLowerCase().includes(query) ||
          inv.status?.toLowerCase().includes(query)
        );

        const filteredPayments = payments.filter(p => 
          p.id?.toLowerCase().includes(query) ||
          p.status?.toLowerCase().includes(query)
        );

        setSearchResults({
          purchaseOrders: filteredPOs,
          invoices: filteredInvoices,
          payments: filteredPayments,
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
        <h1 className="page-title mb-1">Finance Dashboard</h1>
        <p className="muted-text">Track purchase billings, invoice approvals, and banking transaction ledgers.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Reconciling financial metrics..." />
      ) : searchQuery.trim() ? (
        /* Global Search panel */
        <div>
          <div className="enterprise-alert enterprise-alert-success py-2 mb-4 d-flex align-items-center gap-2">
            <i className="bi bi-search text-success"></i>
            <span>Showing search results for: <strong>"{searchQuery}"</strong></span>
          </div>

          <Row className="g-4">
            {/* Purchase Orders */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Matching Purchase Orders ({searchResults.purchaseOrders.length})</h5>
                {searchResults.purchaseOrders.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.purchaseOrders.map(po => (
                      <div key={po.id} className="p-3 border rounded-3 bg-light">
                        <div className="small fw-bold text-dark">{po.id}</div>
                        <div className="text-muted small mt-1">Amount: {formatINR(po.poAmount || po.amount)} &bull; {po.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching purchase orders found.</p>
                )}
              </div>
            </Col>

            {/* Invoices */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Matching Invoices ({searchResults.invoices.length})</h5>
                {searchResults.invoices.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.invoices.map(inv => (
                      <div key={inv.id} className="p-3 border rounded-3 bg-light">
                        <div className="small fw-bold text-dark">{inv.invoiceNumber}</div>
                        <div className="text-muted small mt-1">Amount: {formatINR(inv.invoiceAmount)} &bull; {inv.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching invoices found.</p>
                )}
              </div>
            </Col>

            {/* Payments */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3">Matching Payments ({searchResults.payments.length})</h5>
                {searchResults.payments.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.payments.map(p => (
                      <div key={p.id} className="p-3 border rounded-3 bg-light">
                        <div className="small fw-bold text-dark">{p.id}</div>
                        <div className="text-muted small mt-1">Amount: {formatINR(p.paidAmount)} &bull; {p.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching payments found.</p>
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
                <button className="btn-enterprise-secondary w-100 justify-content-center py-3" onClick={() => navigate('/finance/purchase-orders')}>
                  <i className="bi bi-clipboard-check me-2"></i> Review Purchase Orders
                </button>
              </div>
              <div className="col-md-4">
                <button className="btn-enterprise-secondary w-100 justify-content-center py-3" onClick={() => navigate('/finance/invoices')}>
                  <i className="bi bi-file-earmark-plus me-2"></i> Generate Invoice
                </button>
              </div>
              <div className="col-md-4">
                <button className="btn-enterprise-primary w-100 justify-content-center py-3" onClick={() => navigate('/finance/payments')}>
                  <i className="bi bi-wallet2 me-2"></i> Process Payments
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Row using shared KpiCard */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <KpiCard
                label="Total Invoiced"
                value={formatINR(metrics?.totalInvoiceValue)}
                icon="bi-receipt"
                trend={{ value: 'Cumulative', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Total Paid Settlements"
                value={formatINR(metrics?.totalPayments)}
                icon="bi-check-circle"
                trend={{ value: 'Paid', direction: 'up' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Outstanding Balance"
                value={formatINR(metrics?.outstandingAmount)}
                icon="bi-cash"
                trend={{ value: 'Due', direction: 'down' }}
              />
            </div>

            <div className="col-md-3">
              <KpiCard
                label="Payments Pending"
                value={metrics?.paymentsPending || 0}
                icon="bi-clock"
                trend={{ value: 'Unpaid', direction: 'warning' }}
              />
            </div>
          </div>

          <Row className="g-4">
            {/* Left Column: Payment statistics summaries */}
            <Col lg={8}>
              {/* Payment Summary statistics panel */}
              <div className="enterprise-table-container p-4 h-100">
                <h5 className="small fw-semibold text-uppercase text-muted mb-4"><i className="bi bi-credit-card me-2"></i>Cash Settlement status summary</h5>
                <div className="row g-3 text-center">
                  <div className="col-4">
                    <div className="p-3 border rounded-3 bg-light">
                      <span className="small text-muted fw-semibold text-uppercase d-block mb-1">Pending</span>
                      <h4 className="fw-bold text-dark mb-0">{metrics?.paymentSummary?.pending || 0}</h4>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 border rounded-3 bg-light">
                      <span className="small text-muted fw-semibold text-uppercase d-block mb-1">Failed</span>
                      <h4 className="fw-bold text-danger mb-0">{metrics?.paymentSummary?.failed || 0}</h4>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 border rounded-3 bg-light">
                      <span className="small text-muted fw-semibold text-uppercase d-block mb-1">Completed</span>
                      <h4 className="fw-bold text-success mb-0">{metrics?.paymentSummary?.paid || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            {/* Right Column: Activity Timeline */}
            <Col lg={4}>
              <div className="enterprise-table-container p-4 h-100">
                <h5 className="small fw-semibold text-uppercase text-muted mb-3"><i className="bi bi-bell me-2"></i>Recent Financial Activity</h5>
                <div className="recent-activity-scroll">
                  <ActivityTimeline activities={metrics?.recentActivities} />
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

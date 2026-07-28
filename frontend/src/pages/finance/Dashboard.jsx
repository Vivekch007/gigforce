import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Row, Col, Alert, Button, Card } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getFinanceDashboardMetrics } from '../../services/financeDashboardService';
import { getPurchaseOrders } from '../../services/financePurchaseOrderService';
import { getInvoices } from '../../services/invoiceService';
import { getPayments } from '../../services/paymentService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import FinanceMetricCard from '../../components/finance/FinanceMetricCard';
import ActivityTimeline from '../../components/finance/ActivityTimeline';
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard stats
  const [metrics, setMetrics] = useState(null);


  // Search states
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
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Finance Dashboard</h2>
        <p className="text-muted small mt-1 mb-0">Track purchase billings, invoice approvals, and banking transaction ledgers.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Reconciling financial metrics..." />
      ) : searchQuery.trim() ? (
        /* Global Search panel */
        <div>
          <div className="alert alert-info py-2 mb-4">
            🔍 Showing search results for: <strong>"{searchQuery}"</strong>
          </div>

          <Row className="g-4">
            {/* Purchase Orders */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">📋 Matching Purchase Orders ({searchResults.purchaseOrders.length})</h5>
                {searchResults.purchaseOrders.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.purchaseOrders.map(po => (
                      <div key={po.id} className="p-2 border rounded bg-light">
                        <div className="small fw-bold text-slate-800">{po.id}</div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>Amount: ${parseFloat(po.poAmount || po.amount).toLocaleString()} &bull; {po.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching purchase orders found.</p>
                )}
              </Card>
            </Col>

            {/* Invoices */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">💵 Matching Invoices ({searchResults.invoices.length})</h5>
                {searchResults.invoices.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.invoices.map(inv => (
                      <div key={inv.id} className="p-2 border rounded bg-light">
                        <div className="small fw-bold text-slate-800">{inv.invoiceNumber}</div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>Amount: ${parseFloat(inv.invoiceAmount).toLocaleString()} &bull; {inv.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching invoices found.</p>
                )}
              </Card>
            </Col>

            {/* Payments */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0">
                <h5 className="fw-bold mb-3 text-slate-800">💳 Matching Payments ({searchResults.payments.length})</h5>
                {searchResults.payments.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {searchResults.payments.map(p => (
                      <div key={p.id} className="p-2 border rounded bg-light">
                        <div className="small fw-bold text-slate-800">{p.id}</div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>Amount: ${parseFloat(p.paidAmount).toLocaleString()} &bull; {p.status}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No matching payments found.</p>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ) : (
        /* Normal Dashboard View */
        <div>
          {/* KPI Cards Row */}
          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-7 g-3 mb-4">
            <div className="col">
              <FinanceMetricCard title="Pending POs" value={metrics?.pendingPOs} desc="Awaiting invoice setup" borderStartClass="border-start border-4 border-primary" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Invoices Ready" value={metrics?.invoicesReady} desc="Approved invoices" borderStartClass="border-start border-4 border-warning" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Payments Pending" value={metrics?.paymentsPending} desc="Awaiting bank release" borderStartClass="border-start border-4 border-info" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Payments Paid" value={metrics?.paymentsCompleted} desc="Completed settlements" borderStartClass="border-start border-4 border-success" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Total Invoiced" value={`$${Math.round(metrics?.totalInvoiceValue || 0).toLocaleString()}`} desc="Overall ledger" borderStartClass="border-start border-4 border-dark" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Total Paid" value={`$${Math.round(metrics?.totalPayments || 0).toLocaleString()}`} desc="Disbursed sum" borderStartClass="border-start border-4 border-success" />
            </div>
            <div className="col">
              <FinanceMetricCard title="Outstanding" value={`$${Math.round(metrics?.outstandingAmount || 0).toLocaleString()}`} desc="Approved - Settled" borderStartClass="border-start border-4 border-danger" />
            </div>
          </div>

          <Row className="g-4">
            {/* Left Column: Quick Actions & Payment statistics summaries */}
            <Col lg={8}>
              <Card className="gf-card p-4 border-0 mb-4 bg-white">
                <h5 className="fw-bold mb-3 text-slate-800">Quick Actions</h5>
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="outline-primary" className="py-2 px-3 flex-grow-1" onClick={() => navigate('/finance/purchase-orders')}>
                    📋 Review Purchase Orders
                  </Button>
                  <Button variant="outline-primary" className="py-2 px-3 flex-grow-1" onClick={() => navigate('/finance/invoices')}>
                    💵 Generate Invoice
                  </Button>
                  <Button className="btn-gf-primary py-2 px-3 flex-grow-1" onClick={() => navigate('/finance/payments')}>
                    💳 Process Payments
                  </Button>
                </div>
              </Card>

              {/* Payment Summary statistics panel */}
              <Card className="gf-card p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800">💳 Cash Settlement status summary</h5>
                <div className="row g-3 text-center">
                  <div className="col-4">
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">Pending</span>
                      <h4 className="fw-black text-slate-800 mb-0">{metrics?.paymentSummary?.pending || 0}</h4>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">Failed</span>
                      <h4 className="fw-black text-danger mb-0">{metrics?.paymentSummary?.failed || 0}</h4>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border rounded p-3 bg-light">
                      <span className="small text-muted font-bold text-uppercase d-block mb-1">Completed</span>
                      <h4 className="fw-black text-green-600 mb-0">{metrics?.paymentSummary?.paid || 0}</h4>
                    </div>
                  </div>
                </div>

              </Card>
            </Col>

            {/* Right Column: Activity Timeline */}
            <Col lg={4}>
              <Card className="gf-card p-4 border-0 bg-white h-100">
                <h5 className="fw-bold mb-3 text-slate-800">🔔 Recent Financial Activity</h5>
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

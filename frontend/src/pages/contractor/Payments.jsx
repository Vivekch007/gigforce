import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Card } from 'react-bootstrap';
import { getInvoices } from '../../services/invoiceService';
import { getErrorMessage } from '../../services/errorUtils';

function Payments() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [earnings, setEarnings] = useState([]);

  // Unified session-synchronized visibility state
  const [showEarnings, setShowEarnings] = useState(() => sessionStorage.getItem('gf_earnings_visible') === 'true');
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEarnings, setDisplayEarnings] = useState(() => sessionStorage.getItem('gf_earnings_visible') === 'true');

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setDisplayEarnings(showEarnings);
      setIsAnimating(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [showEarnings]);

  // Summary card values
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastPaymentDate: '—',
    lastPaymentStatus: '—',
  });

  const loadEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      // There is no dedicated "earnings" endpoint - a contractor's payment
      // history is derived from their own invoices (auto-scoped to the
      // caller by the backend), using each invoice's PaymentDate/TotalAmount/Status.
      const invoices = await getInvoices();
      const sorted = [...(invoices || [])].sort(
        (a, b) => new Date(b.InvoiceDate) - new Date(a.InvoiceDate)
      );
      setEarnings(sorted);
      calculateSummary(sorted);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (list) => {
    let total = 0;
    let thisMonthVal = 0;
    let lastDate = '—';
    let lastStatus = '—';

    const now = new Date();

    const paidList = list.filter((item) => item.Status === 'PAID');
    paidList.forEach((item) => {
      const amount = parseFloat(item.TotalAmount || 0);
      total += amount;
      const pDate = item.PaymentDate ? new Date(item.PaymentDate) : null;
      if (pDate && pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()) {
        thisMonthVal += amount;
      }
    });

    if (list.length > 0) {
      const latest = list[0]; // Already sorted descending by invoice date
      lastStatus = latest.Status || '—';
      if (latest.PaymentDate) {
        const pDate = new Date(latest.PaymentDate);
        lastDate = pDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    setSummary({
      totalEarnings: total,
      thisMonthEarnings: thisMonthVal,
      lastPaymentDate: lastDate,
      lastPaymentStatus: lastStatus,
    });
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const toggleEarnings = () => {
    setShowEarnings(prev => {
      const next = !prev;
      sessionStorage.setItem('gf_earnings_visible', next ? 'true' : 'false');
      return next;
    });
  };

  const formatRupees = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `₹ ${formatted}`;
  };

  // Local filter
  const filteredEarnings = earnings.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (item.InvoicePeriod && item.InvoicePeriod.toLowerCase().includes(query)) ||
      (item.Status && item.Status.toLowerCase().includes(query))
    );
  });

  const formatPaymentDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="container-fluid">
      {/* Title Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">My Earnings</h1>
        <p className="muted-text">Review bank disbursement summaries and payout records.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      <div>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted small mt-2 mb-0">Retrieving disbursement records...</p>
          </div>
        ) : (
          <div>
            {/* Summary Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between position-relative" style={{ minHeight: '120px' }}>
                  <button
                    onClick={toggleEarnings}
                    className="border-0 bg-transparent p-0 text-muted position-absolute"
                    style={{ top: '16px', right: '16px', cursor: 'pointer', outline: 'none' }}
                    title={showEarnings ? "Hide earnings" : "Show earnings"}
                    aria-label={showEarnings ? "Hide earnings" : "Show earnings"}
                  >
                    <i className={`bi ${showEarnings ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '15px' }}></i>
                  </button>
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Total Earnings</span>
                    <h3 className={`fw-black text-green-600 mt-1 mb-0 earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '150px', display: 'inline-block' }}>
                      {displayEarnings 
                        ? formatRupees(summary.totalEarnings) 
                        : '₹ ********'}
                    </h3>
                  </div>
                  <p className="text-muted small mb-0 mt-2">All-time paid amount</p>
                </div>
              </div>

              <div className="col-md-3">
                <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between position-relative" style={{ minHeight: '120px' }}>
                  <button
                    onClick={toggleEarnings}
                    className="border-0 bg-transparent p-0 text-muted position-absolute"
                    style={{ top: '16px', right: '16px', cursor: 'pointer', outline: 'none' }}
                    title={showEarnings ? "Hide earnings" : "Show earnings"}
                    aria-label={showEarnings ? "Hide earnings" : "Show earnings"}
                  >
                    <i className={`bi ${showEarnings ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '15px' }}></i>
                  </button>
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>This Month</span>
                    <h3 className={`fw-black text-dark mt-1 mb-0 earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '150px', display: 'inline-block' }}>
                      {displayEarnings 
                        ? formatRupees(summary.thisMonthEarnings) 
                        : '₹ ********'}
                    </h3>
                  </div>
                  <p className="text-muted small mb-0 mt-2">Paid in current month</p>
                </div>
              </div>

              <div className="col-md-3">
                <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Last Payment</span>
                    <h4 className="fw-bold text-slate-800 mt-1 mb-0">{summary.lastPaymentDate}</h4>
                  </div>
                  <p className="text-muted small mb-0 mt-2">Latest bank disbursement</p>
                </div>
              </div>

              <div className="col-md-3">
                <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Last Status</span>
                    <div className="mt-1">
                      <span className={`status-pill ${summary.lastPaymentStatus.toLowerCase() === 'paid' ? 'success' : 'warning'}`}>
                        {summary.lastPaymentStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted small mb-0 mt-2">Status of latest payment</p>
                </div>
              </div>
            </div>

            {searchQuery && (
              <div className="mb-3 text-muted small">
                Showing search results for: &ldquo;<strong>{searchQuery}</strong>&rdquo;
              </div>
            )}

            {/* Earnings List */}
            <div className="d-flex flex-column gap-3">
              {filteredEarnings.length > 0 ? (
                filteredEarnings.map((item) => (
                  <Card key={item.InvoiceID} className="gf-card p-4 mb-0 border-0 bg-white">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <h5 className="fw-black text-slate-800 mb-1">{item.InvoicePeriod}</h5>
                        <div className="text-muted small">
                          Invoice {item.InvoiceNumber} &middot; Payment Date:{' '}
                          <span className="fw-semibold text-slate-700">{formatPaymentDate(item.PaymentDate)}</span>
                        </div>
                      </div>
                      <div className="text-md-end d-flex align-items-center gap-4 flex-wrap">
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-uppercase text-muted font-bold block" style={{ fontSize: '0.65rem' }}>
                            {item.Status === 'PAID' ? 'Amount Received' : 'Invoice Amount'}
                          </span>
                          <div className={`fs-5 fw-black text-green-600 earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '120px', display: 'inline-block' }}>
                            {displayEarnings
                              ? formatRupees(item.TotalAmount)
                              : '₹ ********'}
                          </div>
                        </div>
                        <div>
                          <span className={`status-pill ${item.Status?.toLowerCase() === 'paid' ? 'success' : 'warning'}`}>
                            {item.Status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-5 gf-card border-0 bg-white">
                  <i className="bi bi-wallet2 fs-2 text-muted"></i>
                  <p className="text-muted small mt-2 mb-0">No earnings logs found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;

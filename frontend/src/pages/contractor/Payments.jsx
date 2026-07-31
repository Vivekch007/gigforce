import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Card } from 'react-bootstrap';
import { getInvoices } from '../../services/invoiceService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';

function Payments() {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [earnings, setEarnings] = useState([]);

  // Unified session-synchronized visibility state
  const [showEarnings, setShowEarnings] = useState(() => sessionStorage.getItem('gf_payments_earnings_visible') === 'true');
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEarnings, setDisplayEarnings] = useState(() => sessionStorage.getItem('gf_payments_earnings_visible') === 'true');

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
      // caller by the backend), using each invoice's PaymentDate/totalAmount/Status.
      const invoices = await getInvoices();

      const sorted = [...(invoices || [])].sort(
        (a, b) => new Date(b.InvoiceDate) - new Date(a.InvoiceDate)
      );

      setEarnings(sorted);
      calculateSummary(sorted);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
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

    const paidList = list.filter((item) => item.status === 'PAID');

    paidList.forEach((item) => {
      const amount = parseFloat(item.totalAmount || 0);
      total += amount;
      const pDate = item.paymentDate ? new Date(item.paymentDate) : null;
      if (pDate && pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()) {
        thisMonthVal += amount;
      }
    });

    if (list.length > 0) {
      const latest = list[0]; // Already sorted descending by invoice date
      lastStatus = latest.status || '—';
      if (latest.paymentDate) {
        const pDate = new Date(latest.paymentDate);
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
      sessionStorage.setItem('gf_payments_earnings_visible', next ? 'true' : 'false');
      return next;
    });
  };

  const formatRupees = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `₹${formatted}`;
  };

  // Local filter
  const filteredEarnings = earnings.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (item.invoicePeriod && item.invoicePeriod.toLowerCase().includes(query)) ||
      (item.status && item.status.toLowerCase().includes(query))
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
        <h1 className="page-title mb-1 d-inline-flex align-items-center gap-2">
          <span>My Earnings</span>
          <button
            onClick={toggleEarnings}
            className="border-0 bg-transparent p-0 text-muted d-inline-flex align-items-center"
            style={{ cursor: 'pointer', outline: 'none' }}
            title={showEarnings ? "Hide earnings" : "Show earnings"}
            aria-label={showEarnings ? "Hide earnings" : "Show earnings"}
          >
            {showEarnings ? (
              /* Eye Slash Icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486z" />
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829" />
                <path d="M3.35 5.47q-.27.242-.518.487C1.597 7.22 1 8 1 8s3 5.5 8 5.5c.82 0 1.6-.14 2.327-.394l-.77-.77A6 6 0 0 1 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8q.086-.13.195-.288c.335-.48.83-1.12 1.465-1.755q.247-.248.517-.486z" />
                <path d="M13.646 14.354l-12-12 .708-.708 12 12z" />
              </svg>
            ) : (
              /* Eye Icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
              </svg>
            )}
          </button>
        </h1>
        <p className="muted-text">Review bank disbursement summaries and payout records.</p>
      </div>



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

                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Total Earnings</span>
                    <h3 className={`fw-black text-green-600 mt-1 mb-0 earnings-amount text-truncate ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '150px', display: 'block' }}>
                      {displayEarnings
                        ? formatRupees(summary.totalEarnings)
                        : '₹ *******'}
                    </h3>
                  </div>
                  <p className="text-muted small mb-0 mt-2">All-time paid amount</p>
                </div>
              </div>

              <div className="col-md-3">
                <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between position-relative" style={{ minHeight: '120px' }}>

                  <div>
                    <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>This Month</span>
                    <h3 className={`fw-black text-dark mt-1 mb-0 earnings-amount text-truncate ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '150px', display: 'block' }}>
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
                  <Card key={item.id} className="gf-card p-4 mb-0 border-0 bg-white">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <h5 className="fw-black text-slate-800 mb-1">{item.invoicePeriod.toUpperCase()}</h5>
                        <div className="text-muted small">
                          Invoice : {' '} <span className="fw-semibold text-slate-700">{item.id}</span>
                           <br/> Payment Date:{' '}
                          <span className="fw-semibold text-slate-700">{formatPaymentDate(item.paymentDate)}</span>
                        </div>
                      </div>
                      <div className="text-md-end d-flex align-items-center gap-4 flex-wrap">
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-uppercase text-muted font-bold block" style={{ fontSize: '0.65rem' }}>
                            {item.status === 'PAID' ? 'Amount Received' : 'Invoice Amount'}
                          </span>
                          <div className={`fs-5 fw-black text-green-600 earnings-amount ${isAnimating ? 'fade-out' : ''}`} style={{ minWidth: '120px', display: 'inline-block' }}>
                            {displayEarnings
                              ? formatRupees(item.totalAmount)
                              : '₹********'}
                          </div>
                        </div>
                        <div>
                          <span className={`status-pill ${item.status?.toLowerCase() === 'paid' ? 'success' : 'warning'}`}>
                            {item.status}
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

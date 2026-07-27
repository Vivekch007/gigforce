import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Button, Card, Table } from 'react-bootstrap';
import { getContractorEarnings } from '../../services/analyticsService';
import { getErrorMessage } from '../../services/errorUtils';
import '../../styles/contractor.css';

function Payments() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [earnings, setEarnings] = useState([]);

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
      const data = await getContractorEarnings();
      setEarnings(data || []);
      calculateSummary(data || []);
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

    // Get current month/year string (e.g. "July 2026")
    const now = new Date();
    const currentMonthStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Paid earnings sum
    const paidList = list.filter((item) => item.status === 'Paid');
    paidList.forEach((item) => {
      total += item.amountReceived || 0;
      if (item.month === currentMonthStr) {
        thisMonthVal += item.amountReceived || 0;
      }
    });

    if (list.length > 0) {
      const latest = list[0]; // Already sorted descending by date
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
    if (isUnlocked) {
      loadEarnings();
    }
  }, [isUnlocked]);

  // Local filter
  const filteredEarnings = earnings.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (item.month && item.month.toLowerCase().includes(query)) ||
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
        <h2 className="fw-black text-slate-800 mb-0">My Earnings</h2>
        <p className="text-muted small mt-1 mb-0">Review bank disbursement summaries and payout records.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {!isUnlocked ? (
        /* Privacy Guard Overlay Card */
        <div className="d-flex justify-content-center align-items-center py-5">
          <Card className="gf-card text-center p-5 border-0 shadow" style={{ maxWidth: '500px' }}>
            <span className="fs-1 mb-3">🔒</span>
            <h4 className="fw-black text-slate-800 mb-3">Sensitive Financial Records</h4>
            <p className="text-muted small mb-4">
              This section contains confidential payment and bank disbursement information. To protect your privacy, click unlock to view these records.
            </p>
            <Button className="btn-gf-primary w-100 py-2 fs-6" onClick={() => setIsUnlocked(true)}>
              View Earnings
            </Button>
          </Card>
        </div>
      ) : (
        /* Unlocked Payments summary */
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
                  <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                    <div>
                      <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Total Earnings</span>
                      <h3 className="fw-black text-green-600 mt-1 mb-0">${summary.totalEarnings.toLocaleString()}</h3>
                    </div>
                    <p className="text-muted small mb-0 mt-2">All-time paid amount</p>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
                    <div>
                      <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>This Month</span>
                      <h3 className="fw-black text-slate-800 mt-1 mb-0">${summary.thisMonthEarnings.toLocaleString()}</h3>
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
                        <span className={`gf-badge badge-${summary.lastPaymentStatus.toLowerCase()}`}>
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
                  filteredEarnings.map((item, idx) => (
                    <Card key={idx} className="gf-card p-4 mb-0 border-0 bg-white">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                          <h5 className="fw-black text-slate-800 mb-1">{item.month}</h5>
                          <div className="text-muted small">
                            Payment Date: <span className="fw-semibold text-slate-700">{formatPaymentDate(item.paymentDate)}</span>
                          </div>
                        </div>
                        <div className="text-md-end d-flex align-items-center gap-4 flex-wrap">
                          <div>
                            <span className="text-uppercase text-muted font-bold block" style={{ fontSize: '0.65rem' }}>Amount Received</span>
                            <div className="fs-5 fw-black text-green-600">${parseFloat(item.amountReceived || '0').toLocaleString()}</div>
                          </div>
                          <div>
                            <span className={`gf-badge badge-${item.status?.toLowerCase() === 'paid' ? 'approved' : 'pending'}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-5 gf-card">
                    <span className="fs-1">💵</span>
                    <p className="text-muted small mt-2 mb-0">No earnings logs found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Payments;

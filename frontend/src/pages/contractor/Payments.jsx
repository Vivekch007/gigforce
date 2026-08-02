import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Card, Form, InputGroup, Pagination } from 'react-bootstrap';
import { getInvoices } from '../../services/invoiceService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';

function Payments() {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(false);
  const [earnings, setEarnings] = useState([]);

  // Date Filter State
  const currentDate = new Date();
  const [filterType, setFilterType] = useState('all'); // 'all', 'monthly', 'yearly'
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0 - 11

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Unified session-synchronized visibility state
  const [showEarnings, setShowEarnings] = useState(() => {
    const stored = sessionStorage.getItem('gf_earnings_visible');
    return stored === null ? true : stored === 'true'; // Default to visible
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayEarnings, setDisplayEarnings] = useState(showEarnings);

  useEffect(() => {
    sessionStorage.setItem('gf_earnings_visible', String(showEarnings));
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
      const invoices = await getInvoices();

      const sorted = [...(invoices || [])].sort(
        (a, b) => new Date(b.InvoiceDate || b.invoiceDate) - new Date(a.InvoiceDate || a.invoiceDate)
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
      const latest = list[0]; // Already sorted descending
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
    setShowEarnings(prev => !prev);
  };

  const formatRupees = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `₹${formatted}`;
  };

  // Generate dynamic list of available years for dropdown
  const availableYears = useMemo(() => {
    const years = new Set(
      earnings
        .map(item => item.paymentDate || item.InvoiceDate || item.invoiceDate)
        .filter(Boolean)
        .map(dateStr => new Date(dateStr).getFullYear())
    );
    years.add(new Date().getFullYear()); // Ensure current year is always option
    return Array.from(years).sort((a, b) => b - a);
  }, [earnings]);

  // Combined Search & Calendar Filter Logic
  const filteredEarnings = useMemo(() => {
    return earnings.filter((item) => {
      const query = searchQuery.trim().toLowerCase();

      // 1. Search Query Filter
      const matchesSearch = !query || (
        (item.invoicePeriod && item.invoicePeriod.toLowerCase().includes(query)) ||
        (item.status && item.status.toLowerCase().includes(query))
      );

      if (!matchesSearch) return false;

      // 2. Calendar/Date Filter
      const targetDateStr = item.paymentDate || item.InvoiceDate || item.invoiceDate;
      if (!targetDateStr) return filterType === 'all';

      const itemDate = new Date(targetDateStr);

      if (filterType === 'monthly') {
        return (
          itemDate.getFullYear() === parseInt(selectedYear, 10) &&
          itemDate.getMonth() === parseInt(selectedMonth, 10)
        );
      } else if (filterType === 'yearly') {
        return itemDate.getFullYear() === parseInt(selectedYear, 10);
      }

      return true; // 'all'
    });
  }, [earnings, searchQuery, filterType, selectedYear, selectedMonth]);

  // Reset to first page whenever search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, selectedYear, selectedMonth]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredEarnings.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedEarnings = filteredEarnings.slice(indexOfFirstItem, indexOfLastItem);

  const formatPaymentDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="container-fluid">
      {/* Title Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1 d-inline-flex align-items-center gap-2">
          <span>My Earnings</span>
          <button
            onClick={toggleEarnings}
            className="border-0 bg-transparent p-0 text-muted d-inline-flex align-items-center ms-1"
            style={{ cursor: 'pointer', outline: 'none'}}
            title={showEarnings ? "Hide earnings" : "Show earnings"}
            aria-label={showEarnings ? "Hide earnings" : "Show earnings"}
          >
            {showEarnings ? (
              <i className='bi-eye-slash'></i>
            ) : (
              <i className='bi-eye'></i>
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

            {/* Header Above Transactions List */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <h4 className="fw-bold text-slate-800 mb-0">Recent Transactions</h4>

              {/* Filtering Control Bar */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <InputGroup size="sm" style={{ width: 'auto' }}>
                  <InputGroup.Text className="bg-white text-muted border-end-0">
                    <i className="bi bi-calendar3"></i>
                  </InputGroup.Text>

                  {/* Scope Selector */}
                  <Form.Select
                    size="sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border-start-0 shadow-none fw-semibold"
                    style={{ minWidth: '110px' }}
                  >
                    <option value="all">All Time</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Form.Select>
                </InputGroup>

                {/* Conditional Month Selector */}
                {filterType === 'monthly' && (
                  <Form.Select
                    size="sm"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="shadow-none fw-semibold"
                    style={{ width: '120px' }}
                  >
                    {monthNames.map((name, idx) => (
                      <option key={name} value={idx}>{name}</option>
                    ))}
                  </Form.Select>
                )}

                {/* Conditional Year Selector */}
                {(filterType === 'monthly' || filterType === 'yearly') && (
                  <Form.Select
                    size="sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="shadow-none fw-semibold"
                    style={{ width: '90px' }}
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </Form.Select>
                )}
              </div>
            </div>

            {searchQuery && (
              <div className="mb-3 text-muted small">
                Showing search results for: &ldquo;<strong>{searchQuery}</strong>&rdquo;
              </div>
            )}

            {/* Earnings List */}
            {paginatedEarnings.length > 0 ? (
              <>
                <div className="d-flex flex-column gap-3 mb-4">
                  {paginatedEarnings.map((item) => (
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
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="gf-card p-3 border-0 bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">Show</span>
                    <Form.Select
                      size="sm"
                      style={{ width: '70px' }}
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Form.Select>
                    <span className="text-muted small">
                      entries | Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEarnings.length)} of {filteredEarnings.length}
                    </span>
                  </div>

                  {totalPages > 1 && (
                    <Pagination size="sm" className="mb-0">
                      <Pagination.First
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                      />
                      <Pagination.Prev
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      />
                      {[...Array(totalPages)].map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <Pagination.Item
                            key={pageNum}
                            active={pageNum === currentPage}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Pagination.Item>
                        );
                      })}
                      <Pagination.Next
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      />
                      <Pagination.Last
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                      />
                    </Pagination>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-5 gf-card border-0 bg-white">
                <i className="bi bi-wallet2 fs-2 text-muted"></i>
                <p className="text-muted small mt-2 mb-0">No earnings logs found for the selected period.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;
import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Card, Row, Col, Alert, Spinner, Pagination } from 'react-bootstrap';
import { getInvoices, createInvoice, submitInvoice } from '../../services/invoiceCreationService';
import { getTimesheetsToApprove } from '../../services/approvalService';
import { getAssignmentDetails } from '../../services/managerAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';

function InvoiceCreation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [unbilledTimesheets, setUnbilledTimesheets] = useState([]);
  const [generatedInvoices, setGeneratedInvoices] = useState([]);
  const [stagedTimesheets, setStagedTimesheets] = useState([]);

  // Filtering states - Unbilled
  const [filterMonth, setFilterMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContractor, setFilterContractor] = useState('');

  // Filtering & Pagination states - Generated Invoices
  const [invFilterMonth, setInvFilterMonth] = useState('');
  const [invFilterStatus, setInvFilterStatus] = useState('ALL'); // Status Filter
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Context state for grouped invoice
  const [assignment, setAssignment] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Track draft creation status
  const [draftInvoiceId, setDraftInvoiceId] = useState(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [tsData, invoicesData] = await Promise.all([
        getTimesheetsToApprove({ status: 'APPROVED' }).catch(() => []),
        getInvoices().catch(() => []),
      ]);

      const billedIds = new Set();
      (invoicesData || []).forEach(inv => {
        const tsIds = inv.timesheetIds || inv.timesheet_ids;
        if (tsIds && Array.isArray(tsIds)) {
          tsIds.forEach(id => billedIds.add(id));
        }
      });

      // Filter for unbilled timesheets that are APPROVED and NOT_PROCESSED in payroll
      const unbilled = (tsData || []).filter(t => {
        const isUnbilled = !billedIds.has(t.id);
        const isApproved = t.status?.toUpperCase() === 'APPROVED';
        const isNotProcessed = (t.payroll_status || t.payrollStatus) === 'NOT_PROCESSED';
        const isNotCreated = !t.invoice_id;

        return isUnbilled && isApproved && isNotProcessed && isNotCreated;
      });

      setUnbilledTimesheets(unbilled);
      setGeneratedInvoices(invoicesData || []);
      setStagedTimesheets([]);
      setAssignment(null);
      setDraftInvoiceId(null);
      setIsDraftSaved(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleInclude = async (ts) => {
    if (stagedTimesheets.length > 0 && ts.assignmentId !== stagedTimesheets[0].assignmentId) {
      setError('You can only stage timesheets for the same assignment/contractor. Please remove existing staged timesheets or select a matching one.');
      return;
    }

    setError('');
    setIsDraftSaved(false);
    setDraftInvoiceId(null);

    setUnbilledTimesheets(prev => prev.filter(item => item.id !== ts.id));
    setStagedTimesheets(prev => [...prev, ts]);

    if (stagedTimesheets.length === 0) {
      try {
        setLoadingDetails(true);
        const asnDetails = await getAssignmentDetails(ts.assignmentId);
        setAssignment(asnDetails);
      } catch (err) {
        console.error('Failed to load assignment details', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleRemove = (ts) => {
    setIsDraftSaved(false);
    setDraftInvoiceId(null);
    setStagedTimesheets(prev => prev.filter(item => item.id !== ts.id));
    setUnbilledTimesheets(prev => [...prev, ts]);
    if (stagedTimesheets.length === 1) {
      setAssignment(null);
    }
  };

  const calculateTotalAmount = () => {
    return stagedTimesheets.reduce((sum, ts) => sum + parseFloat(ts.billableAmount || 0), 0);
  };

  // Step 1: Save Draft
  const handleSaveDraft = async () => {
    if (stagedTimesheets.length === 0 || !assignment) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const minDate = new Date(Math.min(...stagedTimesheets.map(t => new Date(t.startDate))));
      const maxDate = new Date(Math.max(...stagedTimesheets.map(t => new Date(t.endDate))));

      const payload = {
        assignmentId: assignment.id,
        invoicePeriod: minDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        timesheetIds: stagedTimesheets.map(t => t.id),
        billingStartDate: minDate.toISOString().split('T')[0],
        billingEndDate: maxDate.toISOString().split('T')[0],
        remarks: remarks,
      };

      const newInvoice = await createInvoice(payload);
      setDraftInvoiceId(newInvoice.id || newInvoice.invoiceid || newInvoice.invoice_id);
      setIsDraftSaved(true);
      setSuccess(`Invoice ${newInvoice.id || newInvoice.invoiceid} saved as Draft. You can now submit it to Finance.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Submit Invoice
  const handleSubmitInvoice = async () => {
    if (!draftInvoiceId) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await submitInvoice(draftInvoiceId);
      setSuccess(`Invoice ${draftInvoiceId} successfully generated and submitted to Finance for review!`);

      setRemarks('');
      loadInitialData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const formatInvoiceStatus = (status) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return 'pending';
      case 'SUBMITTED': return 'info';
      case 'FINANCE_REVIEW': return 'info';
      case 'APPROVED': return 'approved';
      case 'PAID': return 'approved';
      default: return 'rejected';
    }
  };

  // Filtering unbilled timesheets
  const filteredUnbilled = unbilledTimesheets.filter(ts => {
    if (filterMonth && !ts.startDate?.startsWith(filterMonth)) return false;
    if (searchQuery && !ts.id?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterContractor && !ts.contractorName?.toLowerCase().includes(filterContractor.toLowerCase())) return false;
    return true;
  });

  // Dynamic Filter & Sorting for Generated Invoices
  const processedInvoices = generatedInvoices
    .filter(inv => {
      // Month Filter with multi-key fallbacks
      if (invFilterMonth) {
        const bStart = inv.billingStartDate || inv.billing_start_date || inv.invoiceDate || inv.invoice_date || '';
        if (!bStart.startsWith(invFilterMonth)) return false;
      }

      // Status Filter
      if (invFilterStatus !== 'ALL') {
        const currentStatus = (inv.status || '').toUpperCase();
        if (currentStatus !== invFilterStatus) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const idA = String(a.invoiceid || a.invoice_id || a.id || '');
      const idB = String(b.invoiceid || b.invoice_id || b.id || '');
      return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
    });

  // Pagination calculations
  const totalPages = Math.ceil(processedInvoices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = processedInvoices.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Safeguard Invoices</h2>
        <p className="text-muted small mt-1 mb-0">Generate and consolidate billing invoices from approved contractor log sheets.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading billing modules...</p>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            {/* Left Column - Unbilled Timesheets */}
            <div className="col-lg-7">
              <Card className="gf-card p-4 border-0 h-100">
                <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-clipboard me-2"></i>Approved Unbilled Timesheets</h5>

                <Row className="g-2 mb-3">
                  <Col md={4}>
                    <Form.Control type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} size="sm" className="enterprise-form-control" />
                  </Col>
                  <Col md={4}>
                    <Form.Control type="text" placeholder="Search ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} size="sm" className="enterprise-form-control" />
                  </Col>
                  <Col md={4}>
                    <Form.Control type="text" placeholder="Search Contractor..." value={filterContractor} onChange={e => setFilterContractor(e.target.value)} size="sm" className="enterprise-form-control" />
                  </Col>
                </Row>

                <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <Table className="table table-hover align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Contractor</th>
                        <th>Week Period</th>
                        <th>Hours</th>
                        <th>Amount</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnbilled.length > 0 ? (
                        filteredUnbilled.map(ts => (
                            console.log(ts),
                          <tr key={ts.id}>
                            <td className="fw-semibold text-slate-800">{ts.contractorName}</td>
                            <td className="small">{ts.startDate} to {ts.endDate}</td>
                            <td>{ts.totalHoursLogged} hrs</td>
                            <td className="text-green-600 fw-semibold">${parseFloat(ts.billableAmount || '0').toLocaleString()}</td>
                            <td className="text-end">
                              <Button size="sm" className="btn-gf-primary py-1" onClick={() => handleInclude(ts)}>
                                Include
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted small">
                            No matching approved timesheets waiting for billing.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </div>

            {/* Right Column - To Be Billed / Consolidation */}
            <div className="col-lg-5">
              <Card className="gf-card p-4 border-0 h-100">
                <h5 className="fw-bold mb-4 text-slate-800"><i className="bi bi-cash-stack me-2"></i>To Be Billed (Staged)</h5>

                {loadingDetails ? (
                  <div className="text-center py-5"><Spinner animation="border" size="sm" /></div>
                ) : stagedTimesheets.length > 0 && assignment ? (
                  <div className="d-flex flex-column h-100">
                    <div className="table-responsive mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <Table size="sm" className="table align-middle mb-0">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th>Period</th>
                            <th>Amt</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stagedTimesheets.map(ts => (
                            <tr key={ts.id}>
                              <td className="small">{ts.startDate}</td>
                              <td className="text-green-600 fw-bold">${parseFloat(ts.billableAmount || 0).toLocaleString()}</td>
                              <td className="text-end">
                                <Button size="sm" variant="outline-danger" className="py-0 px-2" onClick={() => handleRemove(ts)}>&times;</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    <div className="mt-auto border-top pt-3">
                      <Row className="g-2 mb-3">
                        <Col xs={6}>
                          <span className="small text-muted text-uppercase font-bold">Contractor</span>
                          <div className="fw-bold text-slate-800">{stagedTimesheets[0].contractorName}</div>
                        </Col>
                        <Col xs={6}>
                          <span className="small text-muted text-uppercase font-bold text-green-600">Consolidated Amount</span>
                          <div className="fw-black text-green-600 fs-5">${calculateTotalAmount().toLocaleString()}</div>
                        </Col>
                        <Col xs={12}>
                          <Form.Group controlId="remarks">
                            <Form.Control
                              as="textarea"
                              rows={2}
                              size="sm"
                              placeholder="Optional billing notes..."
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              disabled={isDraftSaved}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-secondary"
                          className="w-50 py-2"
                          onClick={handleSaveDraft}
                          disabled={submitting || isDraftSaved}
                        >
                          {isDraftSaved ? 'Draft Saved ✓' : 'Save Draft'}
                        </Button>
                        <Button
                          className="btn-gf-primary w-50 py-2"
                          onClick={handleSubmitInvoice}
                          disabled={submitting || !isDraftSaved}
                        >
                          Generate Invoice
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted small my-auto">
                    Click "Include" on a timesheet to queue it for billing. You can consolidate multiple timesheets for the same assignment.
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Bottom Row - Generated Invoices */}
          <div className="row">
            <div className="col-12">
              <Card className="gf-card p-4 border-0">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                  <h5 className="fw-bold text-slate-800 mb-0"><i className="bi bi-file-earmark-text me-2"></i>Generated Invoices</h5>

                  {/* Status & Month Filters */}
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <Form.Label className="small text-muted mb-0">Status:</Form.Label>
                      <Form.Select
                        size="sm"
                        value={invFilterStatus}
                        onChange={e => {
                          setInvFilterStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ width: '150px' }}
                        className="enterprise-form-control"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="DRAFT">Draft</option>
                        <option value="FINANCE_REVIEW">Finance Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PAID">Paid</option>
                      </Form.Select>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Form.Label className="small text-muted mb-0">Month:</Form.Label>
                      <Form.Control
                        type="month"
                        value={invFilterMonth}
                        onChange={e => {
                          setInvFilterMonth(e.target.value);
                          setCurrentPage(1);
                        }}
                        size="sm"
                        style={{ width: '160px' }}
                        className="enterprise-form-control"
                      />
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <Table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Invoice Details</th>
                        <th>Billing Period</th>
                        <th>Parties (Contractor / Vendor)</th>
                        <th>Amount (₹)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInvoices.length > 0 ? (
                        currentInvoices.map(inv => {
                          const invoiceId = inv.invoiceid || inv.invoice_id || inv.id;
                          const startDate = inv.billingStartDate || inv.billing_start_date || 'N/A';
                          const endDate = inv.billingEndDate || inv.billing_end_date || 'N/A';
                          const issued = inv.invoiceDate || inv.invoice_date || 'Pending';
                          let due = 'Pending';
                          if (inv.paymentDate || inv.payment_date) {
                            due = inv.paymentDate || inv.payment_date;
                          } else if (issued !== 'Pending') {
                            const d = new Date(issued);
                            if (!isNaN(d.getTime())) {
                              d.setDate(d.getDate() + 30);
                              due = d.toISOString().split('T')[0];
                            }
                          }
                          const amount = parseFloat(inv.totalAmount || inv.total_amount || inv.invoiceAmount || inv.invoice_amount || '0');

                          return (
                            <tr key={inv.id || invoiceId}>
                              <td>
                                <div className="fw-bold text-slate-800">{invoiceId}</div>
                                <div className="small text-muted mt-1">Issue: {issued}</div>
                                <div className="small text-muted">Due: {due}</div>
                              </td>
                              <td className="small">{startDate} to {endDate}</td>
                              <td>
                                <div className="fw-semibold text-slate-800">{inv.contractorName || inv.contractor_name || 'Contractor'}</div>
                                <div className="small text-muted">{inv.vendorName || inv.vendor_name || 'Direct Hire'}</div>
                              </td>
                              <td className="text-green-600 fw-bold">₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td>
                                <span className={`gf-badge badge-${formatInvoiceStatus(inv.status)}`}>
                                  {inv.status || 'DRAFT'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5}>
                            <div className="text-center py-5 text-muted">
                              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-slate-300">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                              <p className="mb-0 fw-medium">No generated invoices found.</p>
                              <p className="small">Consolidate and submit timesheets above to create invoices.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination Controls & Rows-Per-Page Selector */}
                {processedInvoices.length > 0 && (
                  <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-3 border-top gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted">Show</span>
                      <Form.Select
                        size="sm"
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        style={{ width: '75px' }}
                        className="enterprise-form-control"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </Form.Select>
                      <span className="small text-muted">
                        entries per page (Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, processedInvoices.length)} of {processedInvoices.length})
                      </span>
                    </div>

                    {totalPages > 1 && (
                      <Pagination size="sm" className="mb-0">
                        <Pagination.Prev
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        />
                        {[...Array(totalPages)].map((_, idx) => (
                          <Pagination.Item
                            key={idx + 1}
                            active={idx + 1 === currentPage}
                            onClick={() => handlePageChange(idx + 1)}
                          >
                            {idx + 1}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        />
                      </Pagination>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InvoiceCreation;
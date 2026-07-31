import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Card, Row, Col, Alert, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { getInvoices, createInvoice, submitInvoice } from '../../services/invoiceCreationService';
import { getTimesheetsToApprove, getTimesheetDetails } from '../../services/approvalService';
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

  // Filtering states
  const [filterMonth, setFilterMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContractor, setFilterContractor] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Context state for grouped invoice
  const [assignment, setAssignment] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [tsData, invoicesData] = await Promise.all([
        getTimesheetsToApprove({ status: 'APPROVED' }).catch(() => []),
        getInvoices().catch(() => []),
      ]);

      const billedIds = new Set();
      invoicesData.forEach(inv => {
        if (inv.timesheetIds) {
          inv.timesheetIds.forEach(id => billedIds.add(id));
        }
      });

      const unbilled = tsData.filter(t => !billedIds.has(t.id));
      setUnbilledTimesheets(unbilled);
      setGeneratedInvoices(invoicesData);
      setStagedTimesheets([]);
      setAssignment(null);
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
    // Restrict assignment
    if (stagedTimesheets.length > 0 && ts.assignmentId !== stagedTimesheets[0].assignmentId) {
      setError('You can only stage timesheets for the same assignment/contractor. Please remove existing staged timesheets or select a matching one.');
      return;
    }

    setError('');
    // Move from unbilled to staged
    setUnbilledTimesheets(prev => prev.filter(item => item.id !== ts.id));
    setStagedTimesheets(prev => [...prev, ts]);

    // Load assignment details if this is the first item
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
    setStagedTimesheets(prev => prev.filter(item => item.id !== ts.id));
    setUnbilledTimesheets(prev => [...prev, ts]);
    if (stagedTimesheets.length === 1) { // Will become 0
      setAssignment(null);
    }
  };

  const calculateTotalAmount = () => {
    return stagedTimesheets.reduce((sum, ts) => sum + parseFloat(ts.billableAmount || 0), 0);
  };

  const calculateTotalHours = () => {
    return stagedTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHoursLogged || 0), 0);
  };

  const handleAction = async (submitImmediate) => {
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

      if (submitImmediate) {
        await submitInvoice(newInvoice.id);
        setSuccess(`Invoice ${newInvoice.id} generated and submitted to Finance for review!`);
      } else {
        setSuccess(`Invoice ${newInvoice.id} generated successfully as Draft.`);
      }

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

  // Filtering unbilled timesheets dynamically
  const filteredUnbilled = unbilledTimesheets.filter(ts => {
    if (filterMonth && !ts.startDate.startsWith(filterMonth)) return false;
    if (searchQuery && !ts.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterContractor && !ts.contractorName.toLowerCase().includes(filterContractor.toLowerCase())) return false;
    return true;
  });

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
                
                {/* Dynamic Filters */}
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

                {/* Fixed Height Container with Max 5 items roughly (350px) */}
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
                    {/* Staged List */}
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
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <div className="d-flex gap-2">
                        <Button variant="outline-secondary" className="w-50 py-2" onClick={() => handleAction(false)} disabled={submitting}>
                          Save Draft
                        </Button>
                        <Button className="btn-gf-primary w-50 py-2" onClick={() => handleAction(true)} disabled={submitting}>
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
                <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-file-earmark-text me-2"></i>Generated Invoices</h5>
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
                      {generatedInvoices.length > 0 ? (
                        generatedInvoices.map(inv => {
                          const issued = inv.invoiceDate || 'Pending';
                          let due = 'Pending';
                          if (inv.paymentDate) {
                            due = inv.paymentDate;
                          } else if (inv.invoiceDate) {
                            const d = new Date(inv.invoiceDate);
                            d.setDate(d.getDate() + 30);
                            due = d.toISOString().split('T')[0];
                          }
                          return (
                          <tr key={inv.id}>
                            <td>
                              <div className="fw-bold text-slate-800">{inv.invoiceNumber || inv.id}</div>
                              <div className="small text-muted mt-1">Issue: {issued}</div>
                              <div className="small text-muted">Due: {due}</div>
                            </td>
                            <td className="small">{inv.billingStartDate} to {inv.billingEndDate}</td>
                            <td>
                              <div className="fw-semibold text-slate-800">{inv.contractorName || 'Contractor'}</div>
                              <div className="small text-muted">{inv.vendorName || 'Direct Hire'}</div>
                            </td>
                            <td className="text-green-600 fw-bold">₹{parseFloat(inv.totalAmount || inv.invoiceAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td>
                              <span className={`gf-badge badge-${formatInvoiceStatus(inv.status)}`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        )})
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
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InvoiceCreation;

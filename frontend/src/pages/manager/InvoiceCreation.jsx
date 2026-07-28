import React, { useEffect, useState } from 'react';
import { Table, Button, Form, Card, Row, Col, Alert, Spinner, Modal } from 'react-bootstrap';
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

  // Selection state
  const [selectedTs, setSelectedTs] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [assignment, setAssignment] = useState(null);

  // Form remarks
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch approved timesheets and existing invoices in parallel
      const [tsData, invoicesData] = await Promise.all([
        getTimesheetsToApprove({ status: 'APPROVED' }).catch(() => []),
        getInvoices().catch(() => []),
      ]);

      // Filter timesheets that are not yet billed/invoiced
      // Note: We can filter out timesheets whose IDs are already linked in generatedInvoices
      const billedIds = new Set();
      invoicesData.forEach(inv => {
        if (inv.timesheetIds) {
          inv.timesheetIds.forEach(id => billedIds.add(id));
        }
      });

      const unbilled = tsData.filter(t => !billedIds.has(t.id));
      setUnbilledTimesheets(unbilled);
      setGeneratedInvoices(invoicesData);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const selectTimesheetForBilling = async (ts) => {
    try {
      setLoadingDetails(true);
      setSelectedTs(ts);
      setAssignment(null);
      setRemarks('');

      const [tsDetails, asnDetails] = await Promise.all([
        getTimesheetDetails(ts.id).catch(() => ts),
        getAssignmentDetails(ts.assignmentId).catch(() => null),
      ]);

      setSelectedTs(tsDetails);
      setAssignment(asnDetails);
    } catch (err) {
      console.error('Failed to load billing context details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const calculateAmount = () => {
    if (!selectedTs) return 0;
    // Return timesheet's calculated billable amount directly, which is the system-computed rate cost
    return parseFloat(selectedTs.billableAmount || 0);
  };

  const handleAction = async (submitImmediate) => {
    if (!selectedTs || !assignment) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      // Parse billing period from timesheet dates
      const payload = {
        assignmentId: selectedTs.assignmentId,
        invoicePeriod: new Date(selectedTs.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        timesheetIds: [selectedTs.id],
        billingStartDate: selectedTs.startDate,
        billingEndDate: selectedTs.endDate,
        remarks: remarks,
      };

      const newInvoice = await createInvoice(payload);

      if (submitImmediate) {
        await submitInvoice(newInvoice.id);
        setSuccess(`Invoice ${newInvoice.id} generated and submitted to Finance for review!`);
      } else {
        setSuccess(`Invoice ${newInvoice.id} generated successfully as Draft.`);
      }

      setSelectedTs(null);
      setAssignment(null);
      setRemarks('');
      loadInitialData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const showPreview = () => {
    if (!selectedTs || !assignment) return;
    setShowPreviewModal(true);
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

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Invoice Generation</h2>
        <p className="text-muted small mt-1 mb-0">Generate billing invoices from approved contractor log sheets to submit for Finance approval.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading billing modules...</p>
        </div>
      ) : (
        <div className="row g-4">
          {/* Left Column - 7 Cols */}
          <div className="col-lg-7">
            {/* Unbilled Timesheets */}
            <Card className="gf-card p-4 mb-4 border-0">
              <h5 className="fw-bold mb-3 text-slate-800">📋 Approved Unbilled Timesheets</h5>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Contractor</th>
                      <th>Week Period</th>
                      <th>Hours</th>
                      <th>Amount</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unbilledTimesheets.length > 0 ? (
                      unbilledTimesheets.map(ts => (
                        <tr key={ts.id} className={selectedTs?.id === ts.id ? 'table-primary' : ''}>
                          <td className="fw-semibold text-slate-800">{ts.contractorName}</td>
                          <td className="small">{ts.startDate} to {ts.endDate}</td>
                          <td>{ts.totalHoursLogged} hrs</td>
                          <td className="text-green-600 fw-semibold">${parseFloat(ts.billableAmount || '0').toLocaleString()}</td>
                          <td className="text-end">
                            <Button size="sm" className="btn-gf-primary py-1" onClick={() => selectTimesheetForBilling(ts)}>
                              Bill
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted small">
                          No pending approved timesheets waiting for billing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>

            {/* Generated Invoices */}
            <Card className="gf-card p-4 border-0">
              <h5 className="fw-bold mb-3 text-slate-800">📄 Generated Billing Invoices</h5>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Invoice ID</th>
                      <th>Contractor</th>
                      <th>Billing Period</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedInvoices.length > 0 ? (
                      generatedInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="fw-bold">{inv.id}</td>
                          <td>{inv.contractorName || 'Contractor'}</td>
                          <td className="small">{inv.billingStartDate} to {inv.billingEndDate}</td>
                          <td className="text-green-600 fw-bold">${parseFloat(inv.invoiceAmount || '0').toLocaleString()}</td>
                          <td>
                            <span className={`gf-badge badge-${formatInvoiceStatus(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted small">
                          No generated invoices found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Right Column - 5 Cols */}
          <div className="col-lg-5">
            <Card className="gf-card p-4 border-0 sticky-top" style={{ top: '80px' }}>
              <h5 className="fw-bold mb-4 text-slate-800">💰 Invoice Details Preview</h5>
              {loadingDetails ? (
                <div className="text-center py-5"><Spinner animation="border" /></div>
              ) : selectedTs && assignment ? (
                <div>
                  <Row className="g-3">
                    <Col xs={6}>
                      <span className="small text-muted text-uppercase font-bold">Purchase Order ID</span>
                      <div className="fw-semibold text-slate-800">{assignment.poId || 'PO-2026-082'}</div>
                    </Col>
                    <Col xs={6}>
                      <span className="small text-muted text-uppercase font-bold">Billing Period</span>
                      <div className="fw-semibold text-slate-800">{selectedTs.startDate} &mdash; {selectedTs.endDate}</div>
                    </Col>
                    <Col xs={12}>
                      <hr className="my-1" />
                    </Col>
                    <Col xs={6}>
                      <span className="small text-muted text-uppercase font-bold">Client</span>
                      <div className="fw-semibold text-slate-800">{assignment.clientName || 'Internal Client'}</div>
                    </Col>
                    <Col xs={6}>
                      <span className="small text-muted text-uppercase font-bold">Vendor</span>
                      <div className="fw-semibold text-slate-800">{assignment.vendorName || 'Vendor Partner'}</div>
                    </Col>
                    <Col xs={6}>
                      <span className="small text-muted text-uppercase font-bold">Contractor</span>
                      <div className="fw-semibold text-slate-800">{selectedTs.contractorName}</div>
                    </Col>
                    <Col xs={6}>
                      <span className="small text-muted text-uppercase font-bold">Job Title</span>
                      <div className="fw-semibold text-slate-800">{assignment.requisitionTitle || 'Specialist'}</div>
                    </Col>
                    <Col xs={12}>
                      <hr className="my-1" />
                    </Col>
                    <Col xs={4}>
                      <span className="small text-muted text-uppercase font-bold">Approved Hours</span>
                      <div className="fw-bold text-slate-800">{selectedTs.totalHoursLogged} hrs</div>
                    </Col>
                    <Col xs={4}>
                      <span className="small text-muted text-uppercase font-bold">Daily Rate</span>
                      <div className="fw-semibold text-slate-800">${assignment.agreedRatePerDay}/day</div>
                    </Col>
                    <Col xs={4}>
                      <span className="small text-muted text-uppercase font-bold text-green-600">Invoice Amount</span>
                      <div className="fw-black text-green-600 fs-5">${calculateAmount().toLocaleString()}</div>
                    </Col>
                    
                    <Col xs={12}>
                      <Form.Group controlId="remarks">
                        <Form.Label className="uppercase-label">Remarks / Billing Notes</Form.Label>
                        <Form.Control 
                          as="textarea"
                          rows={3}
                          placeholder="e.g. Standard weekly billing. SOW compliance checked."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex flex-column gap-2 mt-4">
                    <Button variant="outline-primary" className="py-2 w-100" onClick={showPreview}>
                      🔍 Preview
                    </Button>
                    <div className="d-flex gap-2">
                      <Button variant="outline-secondary" className="w-50 py-2" onClick={() => handleAction(false)} disabled={submitting}>
                        Save Draft
                      </Button>
                      <Button className="btn-gf-primary w-50 py-2" onClick={() => handleAction(true)} disabled={submitting}>
                        Submit to Finance
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted small">
                  Select an approved timesheet from the left column to preview and generate invoice details.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Invoice Statement Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedTs && assignment && (
            <div className="border p-4 rounded-3 bg-white">
              <div className="d-flex justify-content-between mb-4 flex-wrap gap-2">
                <div>
                  <h4 className="fw-black text-primary mb-0">GIGFORCE</h4>
                  <span className="text-muted small">Workforce Management Platform</span>
                </div>
                <div className="text-end">
                  <h5 className="fw-bold text-slate-700">INVOICE STATEMENT</h5>
                  <span className="text-muted small">Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <Row className="mb-4 small">
                <Col sm={6}>
                  <div className="text-muted font-bold">BILL FROM (VENDOR):</div>
                  <div className="fw-bold text-slate-800">{assignment.vendorName || 'Vendor Partner'}</div>
                  <div className="text-muted">{assignment.vendorEmail || 'partner@vendor.com'}</div>
                </Col>
                <Col sm={6} className="text-sm-end">
                  <div className="text-muted font-bold">BILL TO (CLIENT):</div>
                  <div className="fw-bold text-slate-800">{assignment.clientName || 'Internal Client'}</div>
                  <div className="text-muted">PO Ref: {assignment.poId || 'PO-2026-082'}</div>
                </Col>
              </Row>

              <Table bordered size="sm" className="mb-4 small text-center">
                <thead className="table-light">
                  <tr>
                    <th>Item Description</th>
                    <th>Billing Period</th>
                    <th>Hours Approved</th>
                    <th>Rate</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-start">
                      <strong>{selectedTs.contractorName}</strong> &mdash; {assignment.requisitionTitle || 'Specialist'}
                    </td>
                    <td>{selectedTs.startDate} to {selectedTs.endDate}</td>
                    <td>{selectedTs.totalHoursLogged} hrs</td>
                    <td>${assignment.agreedRatePerDay}/day</td>
                    <td className="text-green-600 fw-bold">${calculateAmount().toLocaleString()}</td>
                  </tr>
                </tbody>
              </Table>

              <div className="d-flex justify-content-end mb-4">
                <div className="text-end">
                  <span className="text-muted font-bold small text-uppercase">Total Due:</span>
                  <h4 className="fw-black text-green-600 mt-1 mb-0">${calculateAmount().toLocaleString()}</h4>
                </div>
              </div>

              {remarks && (
                <div className="small border-top pt-3">
                  <strong>Notes:</strong> {remarks}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default InvoiceCreation;

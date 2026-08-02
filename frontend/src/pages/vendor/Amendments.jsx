import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Form, Modal, Alert, Row, Col, Table as BootstrapTable } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, requestAmendment, getAssignmentAmendments } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';

// Reusable components
import AssignmentDrawer from '../../components/vendor/AssignmentDrawer';
import Loader from '../../components/Loader';
import Table from '../../components/Table';

function Amendments() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { showToast } = useToast();

  // Assignments state
  const [assignments, setAssignments] = useState([]);

  // Offcanvas details drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAsn, setSelectedAsn] = useState(null);

  // Amendment Modal
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendForm, setAmendForm] = useState({
    amendmentType: 'EXTENSION',
    effectiveDate: '',
    newValue: '',
    reason: 'Project Extension',
    remarks: '',
  });
  const [amendmentsHistory, setAmendmentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showViewDetailModal, setShowViewDetailModal] = useState(false);
  const [selectedAmendment, setSelectedAmendment] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAssignments();
      // Filter for active/extended assignments only
      const activeList = (data || []).filter(a => a.status === 'ACTIVE' || a.status === 'EXTENDED');
      setAssignments(activeList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const openDrawer = async (asnId) => {
    try {
      setError('');
      const details = await getAssignmentDetails(asnId);
      setSelectedAsn(details);
      setShowDrawer(true);
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    }
  };

  const fetchAmendmentsHistory = async (assignmentId) => {
    try {
      setLoadingHistory(true);
      const data = await getAssignmentAmendments(assignmentId);
      setAmendmentsHistory(data || []);
    } catch (err) {
      console.error('Failed to load amendment history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAmendmentTypeChange = (type) => {
    let defaultReason = '';
    if (type === 'EXTENSION') {
      defaultReason = 'Project Extension';
    } else if (type === 'RATE_REVISION') {
      defaultReason = 'Annual Rate Revision';
    } else if (type === 'EARLY_TERMINATION') {
      defaultReason = 'Project Completed';
    }
    setAmendForm(prev => ({
      ...prev,
      amendmentType: type,
      newValue: '',
      reason: defaultReason
    }));
  };

  const openAmendModal = (asn) => {
    setSelectedAsn(asn);
    setAmendForm({
      amendmentType: 'EXTENSION',
      effectiveDate: new Date().toISOString().split('T')[0],
      newValue: '',
      reason: 'Project Extension',
      remarks: '',
    });
    setAmendmentsHistory([]);
    fetchAmendmentsHistory(asn.id);
    setShowAmendModal(true);
  };

  const handleAmendSubmit = async () => {
    if (!amendForm.effectiveDate) {
      showToast('Effective Date is required.', 'warning');
      return;
    }
    if (!amendForm.reason) {
      showToast('Reason is required.', 'warning');
      return;
    }

    let payloadValue = amendForm.newValue;
    if (amendForm.amendmentType === 'EARLY_TERMINATION') {
      payloadValue = amendForm.effectiveDate; // early termination end date is the effective date
    }

    if (!payloadValue && amendForm.amendmentType !== 'EARLY_TERMINATION') {
      showToast('New target value is required.', 'warning');
      return;
    }

    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      const payload = {
        amendmentType: amendForm.amendmentType,
        effectiveDate: amendForm.effectiveDate,
        newValue: payloadValue,
        reason: amendForm.reason,
        remarks: amendForm.remarks,
      };

      await requestAmendment(selectedAsn.id, payload);
      showToast('Assignment amendment submitted successfully.', 'success');
      setSuccess('Assignment amendment submitted successfully.');
      setShowAmendModal(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Local Search filtering
  const filteredAssignments = assignments.filter(a => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    return (
      a.contractorName?.toLowerCase().includes(q) ||
      a.clientName?.toLowerCase().includes(q) ||
      a.requisitionTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">Assignment Amendments</h1>
        <p className="muted-text">Submit contract amendment requests for your active contractor assignments.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="enterprise-alert enterprise-alert-success mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <Loader message="Retrieving assignments..." />
      ) : filteredAssignments.length > 0 ? (
        <Table headers={['Assignment ID', 'Contractor', 'Client', 'Job Title', 'Start Date', 'End Date', 'Status', 'Actions']}>
          {filteredAssignments.map(a => (
            <tr key={a.id}>
              <td className="fw-bold">{a.id}</td>
              <td className="fw-semibold text-dark">{a.contractorName}</td>
              <td>{a.clientName || 'Partner Client'}</td>
              <td>{a.requisitionTitle || 'Specialist'}</td>
              <td>{a.startDate}</td>
              <td>{a.endDate || 'Ongoing'}</td>
              <td>
                <span className={`status-pill ${a.status === 'ACTIVE' || a.status === 'EXTENDED' ? 'success' : 'secondary'}`}>
                  {a.status}
                </span>
              </td>
              <td>
                <div className="d-flex gap-2 justify-content-start flex-wrap">
                  <button className="btn-enterprise-secondary py-1 px-3" onClick={() => openDrawer(a.id)}>
                    View Agreement
                  </button>
                  <button className="btn-enterprise-primary py-1 px-3" onClick={() => openAmendModal(a)}>
                    Request Amendment
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-clipboard-x fs-1 text-muted"></i>
          <p className="text-muted small mt-2 mb-0">No active placements found for amendment requests.</p>
        </div>
      )}

      {/* Details drawer */}
      <AssignmentDrawer show={showDrawer} onHide={() => setShowDrawer(false)} assignment={selectedAsn} />

      {/* Main Amendment Modal */}
      <Modal show={showAmendModal} onHide={() => setShowAmendModal(false)} backdrop="static" size="lg" centered style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Modal.Header closeButton className="bg-white border-bottom-0">
          <Modal.Title className="fw-bold text-dark">Amend Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-white px-4">
          {selectedAsn && (
            <div>
              {/* Top Read-only placement summary */}
              <div className="p-3 mb-4 rounded bg-light border">
                <Row className="g-2">
                  <Col md={6}>
                    <span className="text-muted small">Contractor</span>
                    <div className="fw-bold text-dark">{selectedAsn.contractorName || 'Contractor'}</div>
                  </Col>
                  <Col md={6}>
                    <span className="text-muted small">Job Title</span>
                    <div className="fw-bold text-dark">{selectedAsn.requisitionTitle || 'Specialist'}</div>
                  </Col>
                  <Col md={6} className="mt-2">
                    <span className="text-muted small">Current End Date</span>
                    <div className="fw-semibold text-dark">{selectedAsn.endDate || 'Ongoing'}</div>
                  </Col>
                  <Col md={6} className="mt-2">
                    <span className="text-muted small">Current Agreed Rate</span>
                    <div className="fw-semibold text-success">₹{selectedAsn.agreedRatePerDay || '5,000'}/day</div>
                  </Col>
                </Row>
              </div>

              {/* Form Input fields */}
              <Form.Group className="mb-3" controlId="amendType">
                <Form.Label className="enterprise-form-label">Amendment Type *</Form.Label>
                <Form.Select
                  className="enterprise-form-select"
                  value={amendForm.amendmentType}
                  onChange={(e) => handleAmendmentTypeChange(e.target.value)}
                >
                  <option value="EXTENSION">Extension</option>
                  <option value="RATE_REVISION">Rate Revision</option>
                  <option value="EARLY_TERMINATION">Early Termination</option>
                </Form.Select>
              </Form.Group>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="effectiveDate">
                    <Form.Label className="enterprise-form-label">Effective Date *</Form.Label>
                    <Form.Control
                      type="date"
                      required
                      className="enterprise-form-control"
                      value={amendForm.effectiveDate}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    />
                  </Form.Group>
                </Col>

                {amendForm.amendmentType === 'EXTENSION' && (
                  <>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="newValueExt">
                        <Form.Label className="enterprise-form-label">New End Date *</Form.Label>
                        <Form.Control
                          type="date"
                          required
                          className="enterprise-form-control"
                          value={amendForm.newValue}
                          onChange={(e) => setAmendForm(prev => ({ ...prev, newValue: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group className="mb-3" controlId="reasonExt">
                        <Form.Label className="enterprise-form-label">Reason *</Form.Label>
                        <Form.Select
                          className="enterprise-form-select"
                          value={amendForm.reason}
                          onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                        >
                          <option value="Project Extension">Project Extension</option>
                          <option value="Client Request">Client Request</option>
                          <option value="Business Requirement">Business Requirement</option>
                          <option value="Performance Retention">Performance Retention</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </>
                )}

                {amendForm.amendmentType === 'RATE_REVISION' && (
                  <>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="newValueRate">
                        <Form.Label className="enterprise-form-label">New Daily Rate (₹) *</Form.Label>
                        <Form.Control
                          type="number"
                          required
                          step="0.01"
                          placeholder="e.g. 6000"
                          className="enterprise-form-control"
                          value={amendForm.newValue}
                          onChange={(e) => setAmendForm(prev => ({ ...prev, newValue: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group className="mb-3" controlId="reasonRate">
                        <Form.Label className="enterprise-form-label">Reason *</Form.Label>
                        <Form.Select
                          className="enterprise-form-select"
                          value={amendForm.reason}
                          onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                        >
                          <option value="Annual Rate Revision">Annual Rate Revision</option>
                          <option value="Budget Approval">Budget Approval</option>
                          <option value="Performance Increment">Performance Increment</option>
                          <option value="Client Negotiation">Client Negotiation</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </>
                )}

                {amendForm.amendmentType === 'EARLY_TERMINATION' && (
                  <Col md={12}>
                    <Form.Group className="mb-3" controlId="reasonTerm">
                      <Form.Label className="enterprise-form-label">Reason *</Form.Label>
                      <Form.Select
                        className="enterprise-form-select"
                        value={amendForm.reason}
                        onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                      >
                        <option value="Project Completed">Project Completed</option>
                        <option value="Budget Constraints">Budget Constraints</option>
                        <option value="Contractor Resigned">Contractor Resigned</option>
                        <option value="Performance Issues">Performance Issues</option>
                        <option value="Client Cancellation">Client Cancellation</option>
                        <option value="Mutual Agreement">Mutual Agreement</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                )}
              </Row>

              <Form.Group className="mb-4" controlId="remarks">
                <Form.Label className="enterprise-form-label">Remarks (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="enterprise-form-control"
                  placeholder="Provide additional details..."
                  value={amendForm.remarks}
                  onChange={(e) => setAmendForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </Form.Group>

              {/* History Table */}
              <div className="border-top pt-3">
                <h6 className="fw-bold mb-3 text-dark">
                  Previous Amendments ({amendmentsHistory.length})
                </h6>
                {loadingHistory ? (
                  <div className="py-2 text-center text-muted small">Loading history...</div>
                ) : amendmentsHistory.length > 0 ? (
                  <div className="table-responsive">
                    <BootstrapTable hover size="sm" className="align-middle">
                      <thead>
                        <tr className="bg-light text-muted small">
                          <th>Date</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amendmentsHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="small">{item.createdAt?.substring(0, 10) || item.effectiveDate}</td>
                            <td className="small fw-semibold">{item.amendmentType}</td>
                            <td>
                              <span className={`status-pill ${item.status?.toLowerCase() === 'approved' ? 'success' : item.status?.toLowerCase() === 'pending' ? 'warning' : 'secondary'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-enterprise-ghost text-primary border-0 p-0 py-1 px-2 btn-sm fw-bold"
                                onClick={() => {
                                  setSelectedAmendment(item);
                                  setShowViewDetailModal(true);
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </BootstrapTable>
                  </div>
                ) : (
                  <div className="py-2 text-center text-muted small bg-light rounded border">
                    No previous amendments found for this assignment.
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top px-4 py-3">
          <button className="btn-enterprise-secondary" onClick={() => setShowAmendModal(false)}>
            Cancel
          </button>
          <button className="btn-enterprise-primary" onClick={handleAmendSubmit} disabled={submittingAction}>
            {submittingAction ? 'Submitting...' : 'Request Amendment'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* History Detail Pop-up Sub-modal */}
      <Modal
        show={showViewDetailModal}
        onHide={() => setShowViewDetailModal(false)}
        centered
        size="md"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <Modal.Header closeButton className="bg-white border-bottom-0 pb-0">
          <Modal.Title className="fw-bold text-dark fs-5">Amendment Log Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-white px-4">
          {selectedAmendment && (
            <div className="py-2">
              <Row className="g-3">
                <Col xs={6}>
                  <span className="text-muted small d-block">Amendment Type</span>
                  <strong className="text-dark">{selectedAmendment.amendmentType}</strong>
                </Col>
                <Col xs={6}>
                  <span className="text-muted small d-block">Status</span>
                  <span className={`status-pill ${selectedAmendment.status?.toLowerCase() === 'approved' ? 'success' : selectedAmendment.status?.toLowerCase() === 'pending' ? 'warning' : 'secondary'}`}>
                    {selectedAmendment.status}
                  </span>
                </Col>
                <Col xs={6}>
                  <span className="text-muted small d-block">Reason</span>
                  <span className="text-dark">{selectedAmendment.reason || 'N/A'}</span>
                </Col>
                <Col xs={6}>
                  <span className="text-muted small d-block">Effective Date</span>
                  <span className="text-dark">{selectedAmendment.effectiveDate}</span>
                </Col>

                {selectedAmendment.amendmentType === 'EXTENSION' && (
                  <>
                    <Col xs={6}>
                      <span className="text-muted small d-block">Previous End Date</span>
                      <span className="text-dark">{selectedAsn?.endDate}</span>
                    </Col>
                    <Col xs={6}>
                      <span className="text-muted small d-block">New End Date</span>
                      <strong className="text-primary">{selectedAmendment.newValue}</strong>
                    </Col>
                  </>
                )}

                {selectedAmendment.amendmentType === 'RATE_REVISION' && (
                  <>
                    <Col xs={6}>
                      <span className="text-muted small d-block">Previous Agreed Rate</span>
                      <span className="text-dark">₹{selectedAsn?.agreedRatePerDay}/day</span>
                    </Col>
                    <Col xs={6}>
                      <span className="text-muted small d-block">New Agreed Rate</span>
                      <strong className="text-success">₹{selectedAmendment.newValue}/day</strong>
                    </Col>
                  </>
                )}

                {selectedAmendment.amendmentType === 'EARLY_TERMINATION' && (
                  <Col xs={12}>
                    <span className="text-muted small d-block">Early Termination Date</span>
                    <strong className="text-danger">{selectedAmendment.newValue}</strong>
                  </Col>
                )}

                {selectedAmendment.approvedByName && (
                  <Col xs={12}>
                    <span className="text-muted small d-block">Processed By</span>
                    <span className="text-dark">{selectedAmendment.approvedByName}</span>
                  </Col>
                )}

                <Col xs={12}>
                  <span className="text-muted small d-block">Remarks</span>
                  <p className="text-dark small border p-2 bg-light rounded mt-1 mb-0">
                    {selectedAmendment.remarks || 'No remarks provided.'}
                  </p>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top-0 pt-0">
          <button className="btn-enterprise-secondary py-1 px-3" onClick={() => setShowViewDetailModal(false)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Amendments;

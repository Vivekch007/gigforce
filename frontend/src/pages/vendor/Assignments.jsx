import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Form, Modal, Alert } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, requestAmendment, getAssignmentAmendments } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';

// Reusable components
import AssignmentDrawer from '../../components/vendor/AssignmentDrawer';
import Loader from '../../components/Loader';
import Table from '../../components/Table';
import Pagination from '../../components/vendor/Pagination';

const PAGE_SIZE = 10;

function Assignments() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Assignments state
  const [assignments, setAssignments] = useState([]);
  const [page, setPage] = useState(0);

  // Offcanvas details drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAsn, setSelectedAsn] = useState(null);

  // Amendment Modal (Extension / Rate Revision / Scope Change / Early Termination)
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extAsn, setExtAsn] = useState(null);
  const [amendForm, setAmendForm] = useState({
    amendmentType: 'EXTENSION',
    effectiveDate: '',
    newValue: '',
    reason: '',
    remarks: '',
  });
  const [amendmentsHistory, setAmendmentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submittingExt, setSubmittingExt] = useState(false);

  // New Value's input type follows the amendment type, but the field is always just "New Value".
  const getNewValueInputType = (type) => {
    if (type === 'RATE_REVISION') return 'number';
    if (type === 'SCOPE_CHANGE') return 'text';
    return 'date'; // EXTENSION, EARLY_TERMINATION
  };

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAssignments();
      setAssignments(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchVal]);

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

  const openExtensionModal = (asn) => {
    setExtAsn(asn);
    setAmendForm({
      amendmentType: 'EXTENSION',
      effectiveDate: new Date().toISOString().split('T')[0],
      newValue: '',
      reason: '',
      remarks: '',
    });
    setAmendmentsHistory([]);
    fetchAmendmentsHistory(asn.id);
    setShowExtensionModal(true);
  };

  const handleAmendmentTypeChange = (type) => {
    setAmendForm(prev => ({ ...prev, amendmentType: type, newValue: '' }));
  };

  const hasPendingOfSelectedType = amendmentsHistory.some(
    (item) => item.status === 'PENDING' && item.amendmentType === amendForm.amendmentType
  );

  const handleRequestExtension = async () => {
    if (!amendForm.effectiveDate) {
      showToast('Effective Date is required.', 'warning');
      return;
    }
    if (!amendForm.newValue) {
      showToast('New Value is required.', 'warning');
      return;
    }
    if (!amendForm.reason.trim()) {
      showToast('Reason is required.', 'warning');
      return;
    }

    try {
      setSubmittingExt(true);
      setError('');

      const payload = {
        amendmentType: amendForm.amendmentType,
        effectiveDate: amendForm.effectiveDate,
        newValue: amendForm.newValue,
        reason: amendForm.reason,
        remarks: amendForm.remarks,
      };

      await requestAmendment(extAsn.id, payload);
      showToast(`Amendment request submitted for contractor: ${extAsn.contractorName}!`, 'success');
      setShowExtensionModal(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingExt(false);
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

  const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE) || 1;
  const paginatedAssignments = filteredAssignments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">{user?.name || 'Vendor'} Assignments Tracker</h1>
        <p className="muted-text">Track active contractor placements, review SOW agreements, and request contract extensions.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Retrieving placements..." />
      ) : filteredAssignments.length > 0 ? (
        <>
        <Table headers={['Assignment ID', 'Contractor', 'Client', 'Job Title', 'Start Date', 'End Date', 'Status', 'Actions']}>
          {paginatedAssignments.map(a => (
            <tr key={a.id}>
              <td className="fw-bold">{a.id}</td>
              <td className="fw-semibold text-dark">{a.contractorName}</td>
              <td>{a.orgUnitId || 'Partner Client'}</td>
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
                  {(a.status === 'ACTIVE' || a.status === 'EXTENDED') && (
                    <button className="btn-enterprise-primary py-1 px-3" onClick={() => openExtensionModal(a)}>
                      Request Amendment
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-clipboard-check fs-1 text-muted"></i>
          <p className="text-muted small mt-2 mb-0">No placements or active assignments found.</p>
        </div>
      )}

      {/* Details drawer */}
      <AssignmentDrawer show={showDrawer} onHide={() => setShowDrawer(false)} assignment={selectedAsn} />

      {/* Amendment request modal */}
      <Modal show={showExtensionModal} onHide={() => setShowExtensionModal(false)} backdrop="static" size="lg" centered style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Modal.Header closeButton className="bg-white border-bottom-0">
          <Modal.Title className="fw-bold text-dark">Request Assignment Amendment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-white">
          {extAsn && (
            <div>
              <div className="p-3 mb-3 rounded bg-light border">
                <div className="row g-2">
                  <div className="col-md-6">
                    <span className="text-muted small">Contractor</span>
                    <div className="fw-bold text-dark">{extAsn.contractorName}</div>
                  </div>
                  <div className="col-md-6">
                    <span className="text-muted small">Job Title</span>
                    <div className="fw-bold text-dark">{extAsn.requisitionTitle || 'Specialist'}</div>
                  </div>
                  <div className="col-md-6 mt-2">
                    <span className="text-muted small">Current End Date</span>
                    <div className="fw-semibold text-dark">{extAsn.endDate || 'Ongoing'}</div>
                  </div>
                  <div className="col-md-6 mt-2">
                    <span className="text-muted small">Current Agreed Rate</span>
                    <div className="fw-semibold text-success">₹{extAsn.agreedRatePerDay}/day</div>
                  </div>
                </div>
              </div>

              <Form.Group className="mb-3" controlId="amendType">
                <Form.Label className="enterprise-form-label">Amendment Type *</Form.Label>
                <Form.Select
                  className="enterprise-form-select form-select"
                  value={amendForm.amendmentType}
                  onChange={(e) => handleAmendmentTypeChange(e.target.value)}
                >
                  <option value="EXTENSION">Extension</option>
                  <option value="RATE_REVISION">Rate Revision</option>
                  <option value="SCOPE_CHANGE">Scope Change</option>
                  <option value="EARLY_TERMINATION">Early Termination</option>
                </Form.Select>
              </Form.Group>

              {hasPendingOfSelectedType && (
                <Alert variant="warning" className="py-2 small mb-3">
                  A {amendForm.amendmentType.replace('_', ' ').toLowerCase()} request is already pending for this assignment.
                  You can raise another once it&apos;s approved or rejected by the hiring manager.
                </Alert>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="effectiveDate">
                    <Form.Label className="enterprise-form-label">Effective Date *</Form.Label>
                    <Form.Control
                      type="date"
                      required
                      className="enterprise-form-control form-control"
                      value={amendForm.effectiveDate}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3" controlId="newValue">
                    <Form.Label className="enterprise-form-label">New Value *</Form.Label>
                    <Form.Control
                      type={getNewValueInputType(amendForm.amendmentType)}
                      required
                      step={amendForm.amendmentType === 'RATE_REVISION' ? '0.01' : undefined}
                      placeholder={amendForm.amendmentType === 'RATE_REVISION' ? 'e.g. 6000' : amendForm.amendmentType === 'SCOPE_CHANGE' ? 'Describe the new scope...' : undefined}
                      className="enterprise-form-control form-control"
                      value={amendForm.newValue}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, newValue: e.target.value }))}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-12">
                  <Form.Group className="mb-3" controlId="reason">
                    <Form.Label className="enterprise-form-label">Reason *</Form.Label>
                    <Form.Control
                      type="text"
                      required
                      placeholder="e.g. Project Extension, Client Request..."
                      className="enterprise-form-control form-control"
                      value={amendForm.reason}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3" controlId="remarks">
                <Form.Label className="enterprise-form-label">Remarks (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  className="enterprise-form-control form-control"
                  placeholder="Provide additional details..."
                  value={amendForm.remarks}
                  onChange={(e) => setAmendForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </Form.Group>

              <div className="border-top pt-3">
                <h6 className="fw-bold mb-3 text-dark">Previous Amendments ({amendmentsHistory.length})</h6>
                {loadingHistory ? (
                  <div className="py-2 text-center text-muted small">Loading history...</div>
                ) : amendmentsHistory.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm align-middle table-mobile-scaled">
                      <thead>
                        <tr className="bg-light text-muted small">
                          <th>Date</th>
                          <th>Type</th>
                          <th>Status</th>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
        <Modal.Footer className="bg-white border-top-0">
          <button className="btn-enterprise-secondary" onClick={() => setShowExtensionModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleRequestExtension} disabled={submittingExt || hasPendingOfSelectedType}>
            {submittingExt ? 'Submitting...' : 'Request Amendment'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Assignments;
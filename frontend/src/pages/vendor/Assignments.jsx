import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Form, Modal, Alert } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, requestAssignmentExtension } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/apiClient';

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

  // Extension Modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extAsn, setExtAsn] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [extReason, setExtReason] = useState('Project Extension');
  const [extRemarks, setExtRemarks] = useState('');
  const [submittingExt, setSubmittingExt] = useState(false);

  // PO Creation Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [poAsn, setPoAsn] = useState(null);
  const [poAmount, setPoAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [submittingPo, setSubmittingPo] = useState(false);

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

  const openExtensionModal = (asn) => {
    setExtAsn(asn);
    setNewEndDate('');
    setExtReason('Project Extension');
    setExtRemarks('');
    setShowExtensionModal(true);
  };

  const handleRequestExtension = async () => {
    if (!newEndDate) {
      setError('Please select a target extension end date.');
      showToast('Please select a target extension end date.', 'warning');
      return;
    }
    if (!extReason) {
      setError('Please select a reason for the extension.');
      showToast('Please select a reason for the extension.', 'warning');
      return;
    }

    try {
      setSubmittingExt(true);
      setError('');

      const payload = {
        effectiveDate: new Date().toISOString().split('T')[0],
        newValue: newEndDate,
        reason: extReason,
        remarks: extRemarks,
      };

      await requestAssignmentExtension(extAsn.id, payload);
      showToast(`Extension amendment request submitted for contractor: ${extAsn.contractorName}!`, 'success');
      setShowExtensionModal(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingExt(false);
    }
  };

  const openPOModal = (asn) => {
    setPoAsn(asn);
    setPoAmount('');
    setCurrency('INR');
    setShowPOModal(true);
  };

  const handleCreatePO = async () => {
    if (!poAmount) {
      showToast('Please enter PO amount.', 'warning');
      return;
    }
    try {
      setSubmittingPo(true);
      await apiClient.post('/purchase-orders', {
        AssignmentID: poAsn.id,
        VendorID: user?.orgUnitId || 'VENDOR_ORG',
        POAmount: parseFloat(poAmount),
        Currency: currency
      });
      showToast('Purchase Order generated successfully!', 'success');
      setShowPOModal(false);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingPo(false);
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
        <Table headers={['Assignment ID', 'Contractor', 'Client', 'Job Title', 'PO ID', 'Vendor Org', 'Start Date', 'End Date', 'Status', 'Actions']}>
          {paginatedAssignments.map(a => (
            <tr key={a.id}>
              <td className="fw-bold">{a.id}</td>
              <td className="fw-semibold text-dark">{a.contractorName}</td>
              <td>{a.clientName || 'Partner Client'}</td>
              <td>{a.requisitionTitle || 'Specialist'}</td>
              <td>{a.poId || <span className="text-muted">Pending</span>}</td>
              <td>{a.vendorName || 'Staffing Partner'}</td>
              <td>{a.startDate}</td>
              <td>{a.endDate || 'Ongoing'}</td>
              <td>
                <span className={`status-pill ${a.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                  {a.status}
                </span>
              </td>
              <td>
                <div className="d-flex gap-2 justify-content-start flex-wrap">
                  <button className="btn-enterprise-secondary py-1 px-3" onClick={() => openDrawer(a.id)}>
                    View Agreement
                  </button>
                  {a.status === 'ACTIVE' && (
                    <>
                      <button className="btn-enterprise-primary py-1 px-3" onClick={() => openExtensionModal(a)}>
                        Request Extension
                      </button>
                      <button className="btn-enterprise-primary py-1 px-3" onClick={() => openPOModal(a)}>
                        Create PO
                      </button>
                    </>
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

      {/* Extension request modal */}
      <Modal show={showExtensionModal} onHide={() => setShowExtensionModal(false)} backdrop="static" centered style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Modal.Header closeButton className="bg-white border-bottom-0">
          <Modal.Title className="fw-bold text-dark">Request Assignment Extension</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-white">
          {extAsn && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Contractor</span>
                <h6 className="fw-bold text-dark mt-1">{extAsn.contractorName}</h6>
                <span className="text-muted small">Current End Date: {extAsn.endDate || 'Ongoing'}</span>
              </div>

              <Form.Group className="mb-3" controlId="newEndDate">
                <Form.Label className="enterprise-form-label">Proposed New End Date</Form.Label>
                <Form.Control
                  type="date"
                  required
                  className="enterprise-form-control"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="extReason">
                <Form.Label className="enterprise-form-label">Reason <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  className="enterprise-form-select"
                  required
                >
                  <option value="Project Extension">Project Extension</option>
                  <option value="Client Request">Client Request</option>
                  <option value="Business Requirement">Business Requirement</option>
                  <option value="Performance Retention">Performance Retention</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3" controlId="remarks">
                <Form.Label className="enterprise-form-label">Extension Rationale</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  className="enterprise-form-control"
                  placeholder="e.g. Project timeline extended. Continuing deliverables."
                  value={extRemarks}
                  onChange={(e) => setExtRemarks(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top-0">
          <button className="btn-enterprise-secondary" onClick={() => setShowExtensionModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleRequestExtension} disabled={submittingExt}>
            {submittingExt ? 'Submitting...' : 'Request Extension'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* PO Creation modal */}
      <Modal show={showPOModal} onHide={() => setShowPOModal(false)} backdrop="static" centered style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Modal.Header closeButton className="bg-white border-bottom-0">
          <Modal.Title className="fw-bold text-dark">Create Purchase Order</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-white">
          {poAsn && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Generate PO for Assignment:</span>
                <h6 className="fw-bold text-dark mt-1">{poAsn.id} - {poAsn.contractorName}</h6>
              </div>
              <Form.Group className="mb-3" controlId="poAmount">
                <Form.Label className="enterprise-form-label">PO Amount</Form.Label>
                <Form.Control
                  type="number"
                  required
                  className="enterprise-form-control"
                  value={poAmount}
                  onChange={(e) => setPoAmount(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="poCurrency">
                <Form.Label className="enterprise-form-label">Currency</Form.Label>
                <Form.Select
                  className="enterprise-form-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top-0">
          <button className="btn-enterprise-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleCreatePO} disabled={submittingPo}>
            {submittingPo ? 'Creating...' : 'Generate PO'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Assignments;

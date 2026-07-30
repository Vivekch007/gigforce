import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Modal, Row, Col, Alert, Spinner, Pagination, Offcanvas } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, completeAssignment, requestAmendment } from '../../services/managerAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useConfirmation } from '../../context/ConfirmationContext';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function Assignments() {
  const { showConfirmation } = useConfirmation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assignments lists
  const [assignments, setAssignments] = useState([]);
  const [pageMeta, setPageMeta] = useState({ pageNumber: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(0);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drawer / Modals
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAsn, setSelectedAsn] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendForm, setExtendForm] = useState({
    effectiveDate: '',
    newValue: '', // new end date
    remarks: '',
  });
  const [submittingAction, setSubmittingAction] = useState(false);
  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: currentPage,
        size: 10,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const data = await getAssignments(params);
      setAssignments(data?.content || []);
      setPageMeta({
        pageNumber: data?.pageable?.pageNumber || 0,
        totalPages: data?.totalPages || 1,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [currentPage, statusFilter]);

  const viewAssignmentDetails = async (asn) => {
    try {
      setSelectedAsn(asn);
      setShowDrawer(true);
      setLoadingDetails(true);
      const details = await getAssignmentDetails(asn.id);
      setSelectedAsn(details);
    } catch (err) {
      console.error('Failed to load assignment details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseAssignment = async (id) => {
    const confirmed = await showConfirmation({ title: 'Close Assignment', message: 'Are you sure you want to close this assignment engagement?' });
    if (!confirmed) return;
    try {
      setError('');
      setSuccess('');
      await completeAssignment(id);
      setSuccess(`Assignment ${id} completed/closed successfully.`);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openExtendModal = (asn) => {
    setSelectedAsn(asn);
    setExtendForm({
      effectiveDate: new Date().toISOString().split('T')[0],
      newValue: '',
      remarks: '',
    });
    setShowExtendModal(true);
  };

  const handleExtendSubmit = async () => {
    if (!extendForm.newValue || !extendForm.effectiveDate) {
      setError('Effective Date and New End Date are required.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      await requestAmendment(selectedAsn.id, {
        amendmentType: 'EXTENSION',
        effectiveDate: extendForm.effectiveDate,
        newValue: extendForm.newValue,
        remarks: extendForm.remarks,
      });

      setSuccess(`Extension request submitted for assignment ${selectedAsn.id}.`);
      setShowExtendModal(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Local filter
  const filteredAssignments = assignments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (item.contractorName && item.contractorName.toLowerCase().includes(q)) ||
      (item.requisitionTitle && item.requisitionTitle.toLowerCase().includes(q)) ||
      item.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header (Renamed Contractor Placements to Assignments - User Request 1) */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="page-title mb-1">Assignments</h1>
          <p className="muted-text">Track active contractor engagements, review statement of work (SOW) terms, and handle extensions.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            className="enterprise-form-select"
            style={{ width: '220px' }}
          >
            <option value="ALL">All Assignments</option>
            <option value="ACTIVE">Active</option>
            <option value="EXTENDED">Extended</option>
            <option value="COMPLETED">Completed</option>
            <option value="TERMINATED_EARLY">Terminated Early</option>
            <option value="CANCELLED">Cancelled</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="enterprise-alert enterprise-alert-success mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <Loader message="Loading assignment records..." />
      ) : (
        <div>
          {filteredAssignments.length > 0 ? (
            <Table headers={['Assignment ID', 'Contractor', 'Job Title', 'Engagement Period', 'Agreed Rate', 'Status', 'Actions']}>
              {filteredAssignments.map((asn) => (
                <tr key={asn.id}>
                  <td className="fw-bold">{asn.id}</td>
                  <td className="fw-semibold text-dark">{asn.contractorName || 'Contractor'}</td>
                  <td>{asn.requisitionTitle || 'Specialist'}</td>
                  <td className="small">
                    <span className="fw-medium">{asn.startDate}</span> to <span className="fw-medium">{asn.endDate}</span>
                  </td>
                  <td className="text-success fw-bold">₹{asn.agreedRatePerDay}/day</td>
                  <td>
                    <span className={`status-pill ${asn.status.toLowerCase() === 'active' || asn.status.toLowerCase() === 'extended' ? 'success' : 'secondary'}`}>
                      {asn.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2 justify-content-start">
                      <button className="btn-enterprise-secondary py-1 px-3" onClick={() => viewAssignmentDetails(asn)}>
                        View
                      </button>
                      
                      {(asn.status === 'ACTIVE' || asn.status === 'EXTENDED') && (
                        <>
                          <button className="btn-enterprise-primary py-1 px-3" onClick={() => openExtendModal(asn)}>
                            Extend
                          </button>
                          <button className="btn-enterprise-ghost text-danger py-1 px-3 border-0" onClick={() => handleCloseAssignment(asn.id)}>
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="enterprise-table-container p-5 text-center text-muted">
              <i className="bi bi-journal-x fs-2"></i>
              <p className="small mt-2 mb-0">No assignments found matching this criteria.</p>
            </div>
          )}

          {/* Pagination */}
          {pageMeta.totalPages > 1 && (
            <div className="enterprise-pagination">
              <span className="small text-muted">Page {currentPage + 1} of {pageMeta.totalPages}</span>
              <Pagination className="m-0">
                <Pagination.First onClick={() => setCurrentPage(0)} disabled={currentPage === 0} />
                <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0} />
                {[...Array(pageMeta.totalPages)].map((_, i) => (
                  <Pagination.Item key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(pageMeta.totalPages - 1, prev + 1))} disabled={currentPage === pageMeta.totalPages - 1} />
                <Pagination.Last onClick={() => setCurrentPage(pageMeta.totalPages - 1)} disabled={currentPage === pageMeta.totalPages - 1} />
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Assignment SOW Details Drawer */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '500px' }} className="enterprise-modal-content">
        <Offcanvas.Header closeButton className="border-bottom enterprise-modal-header">
          <Offcanvas.Title className="fw-bold text-dark">Statement of Work (SOW)</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="enterprise-modal-body">
          {loadingDetails ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted small mt-2">Loading SOW details...</p>
            </div>
          ) : selectedAsn ? (
            <div className="d-flex flex-column gap-3">
              <div className="bg-light p-3 rounded mb-2">
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Contractor</div>
                <h5 className="fw-bold text-dark mb-0">{selectedAsn.contractorName}</h5>
                <span className="text-muted small">Assignment Ref: {selectedAsn.id}</span>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Client Account / Org unit</div>
                <div className="fw-semibold text-dark">{selectedAsn.orgUnitId === 'bu1' ? 'Engineering' : 'Corporate'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Role Designation</div>
                <div className="fw-semibold text-dark">{selectedAsn.requisitionTitle || 'Specialist'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Contract Period</div>
                <div className="fw-semibold text-dark">{selectedAsn.startDate} to {selectedAsn.endDate}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Agreed Bill Rate</div>
                <div className="fw-bold text-success fs-5">₹{selectedAsn.agreedRatePerDay}/day</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>SOW reference number</div>
                <div className="fw-mono text-slate-700 bg-light p-2 rounded small mt-1">{selectedAsn.sowReference || 'SOW-2026-9023-A'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Compliance status</div>
                <span className="status-pill success mt-1">COMPLIANT</span>
              </div>
            </div>
          ) : (
            <p className="text-muted text-center py-5">No assignment data loaded.</p>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Extend Contract Modal */}
      <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Extend Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group controlId="extEffDate">
                  <Form.Label className="enterprise-form-label">Effective Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date"
                    value={extendForm.effectiveDate}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="enterprise-form-control"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="extNewEnd">
                  <Form.Label className="enterprise-form-label">New End Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date"
                    value={extendForm.newValue}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, newValue: e.target.value }))}
                    className="enterprise-form-control"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="extRemarks">
                  <Form.Label className="enterprise-form-label">Extension Justification / Remarks</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={3}
                    placeholder="Provide justification notes for extension..."
                    value={extendForm.remarks}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="enterprise-form-control"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowExtendModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleExtendSubmit} disabled={submittingAction}>
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Request Extension'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Assignments;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Row, Col, Alert, Spinner, Pagination, Offcanvas } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, completeAssignment, requestAmendment } from '../../services/managerAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';

function Assignments() {
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
      console.error('Failed to load placement details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseAssignment = async (id) => {
    if (!window.confirm('Are you sure you want to close this placement assignment?')) return;
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
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Contractor Placements</h2>
          <p className="text-muted small mt-1 mb-0">Track active contractor engagements, review statement of work (SOW) terms, and handle extensions.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            style={{ width: '180px' }}
          >
            <option value="ALL">All Placements</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="SUSPENDED">Suspended</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading placement records...</p>
        </div>
      ) : (
        <div className="gf-card p-0 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Assignment ID</th>
                  <th>Contractor</th>
                  <th>Job Title</th>
                  <th>Engagement Period</th>
                  <th>Agreed Rate</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((asn) => (
                    <tr key={asn.id}>
                      <td className="fw-bold">{asn.id}</td>
                      <td className="fw-semibold text-slate-800">{asn.contractorName || 'Contractor'}</td>
                      <td>{asn.requisitionTitle || 'Specialist'}</td>
                      <td className="small">
                        <span className="fw-medium">{asn.startDate}</span> to <span className="fw-medium">{asn.endDate}</span>
                      </td>
                      <td className="text-green-600 fw-bold">${asn.agreedRatePerDay}/day</td>
                      <td>
                        <span className={`gf-badge badge-${asn.status.toLowerCase() === 'active' ? 'approved' : 'rejected'}`}>
                          {asn.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button size="sm" variant="outline-primary" onClick={() => viewAssignmentDetails(asn)}>
                            View
                          </Button>
                          
                          {asn.status === 'ACTIVE' && (
                            <>
                              <Button size="sm" className="btn-gf-primary" onClick={() => openExtendModal(asn)}>
                                Extend
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => handleCloseAssignment(asn.id)}>
                                Close
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No contractor placements logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {pageMeta.totalPages > 1 && (
            <div className="d-flex justify-content-center p-3">
              <Pagination>
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
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '500px' }}>
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold text-slate-800">Statement of Work (SOW)</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {loadingDetails ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted small">Loading SOW details...</p>
            </div>
          ) : selectedAsn ? (
            <div className="d-flex flex-column gap-3">
              <div className="bg-light p-3 rounded mb-2">
                <div className="small text-muted font-bold text-uppercase">Contractor</div>
                <h5 className="fw-bold text-slate-800 mb-0">{selectedAsn.contractorName}</h5>
                <span className="text-muted small">Assignment Ref: {selectedAsn.id}</span>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase">Client Account / Org unit</div>
                <div className="fw-semibold text-slate-800">{selectedAsn.orgUnitId === 'bu1' ? 'Engineering' : 'Corporate'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase">Role Designation</div>
                <div className="fw-semibold text-slate-800">{selectedAsn.requisitionTitle || 'Specialist'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase">Contract Period</div>
                <div className="fw-semibold text-slate-800">{selectedAsn.startDate} to {selectedAsn.endDate}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase">Agreed Bill Rate</div>
                <div className="fw-bold text-green-600 fs-5">${selectedAsn.agreedRatePerDay}/day</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase">SOW reference number</div>
                <div className="fw-mono text-slate-700 bg-light p-2 rounded small mt-1">{selectedAsn.sowReference || 'SOW-2026-9023-A'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase">Compliance status</div>
                <span className="gf-badge badge-approved mt-1">COMPLIANT</span>
              </div>
            </div>
          ) : (
            <p className="text-muted text-center py-5">No assignment data loaded.</p>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Extend Contract Modal */}
      <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Extend Contractor Placement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group controlId="extEffDate">
                  <Form.Label className="uppercase-label">Effective Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date"
                    value={extendForm.effectiveDate}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="extNewEnd">
                  <Form.Label className="uppercase-label">New End Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="date"
                    value={extendForm.newValue}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, newValue: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="extRemarks">
                  <Form.Label className="uppercase-label">Extension Justification / Remarks</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={3}
                    placeholder="Provide justification notes for extension..."
                    value={extendForm.remarks}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtendModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleExtendSubmit} disabled={submittingAction}>
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Request Extension'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Assignments;

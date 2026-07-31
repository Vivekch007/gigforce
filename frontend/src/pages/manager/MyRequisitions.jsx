import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Modal, Row, Col, Alert, Spinner, Pagination } from 'react-bootstrap';
import { getRequisitions, publishRequisition, cancelRequisition, closeRequisition, updateRequisition } from '../../services/requisitionService';
import { getSkills } from '../../services/contractorService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function MyRequisitions() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Requisitions Page data
  const [requisitions, setRequisitions] = useState([]);
  const [pageMeta, setPageMeta] = useState({ pageNumber: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Skill catalog for editing
  const [skills, setSkills] = useState([]);

  // Modals States
  const [selectedReq, setSelectedReq] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadRequisitions = async () => {
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

      if (searchQuery.trim()) {
        params.jobTitle = searchQuery.trim();
      }

      const data = await getRequisitions(params);
      setRequisitions(data?.content || []);
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

  const loadSkills = async () => {
    try {
      const data = await getSkills();
      setSkills(data || []);
    } catch (err) {
      console.error('Failed to load skills catalog', err);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    loadSkills();
  }, []);

  const handlePublish = async (id) => {
    try {
      setError('');
      await publishRequisition(id);
      showToast(`Requisition ${id} published successfully!`, 'success');
      loadRequisitions();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleCancel = async (id) => {
    try {
      setError('');
      await cancelRequisition(id);
      showToast(`Requisition ${id} cancelled successfully!`, 'success');
      loadRequisitions();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleClose = async (id) => {
    try {
      setError('');
      await closeRequisition(id);
      showToast(`Requisition ${id} closed successfully!`, 'success');
      loadRequisitions();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  // Edit Action Handlers
  const openEdit = (req) => {
    setSelectedReq(req);
    setEditForm({
      title: req.title || '',
      description: req.description || '',
      requiredSkillId: req.requiredSkillId || '',
      minExperienceYears: req.minExperienceYears || 0,
      maxHourlyRate: req.maxHourlyRate || 0.0,
      quantity: req.quantity || 1,
      engagementType: req.engagementType || 'ONSITE',
      experienceLevel: req.experienceLevel || 'MID',
      startDate: req.startDate || '',
      duration: req.duration || '6 Months',
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'minExperienceYears' || name === 'quantity'
        ? parseInt(value) || 0
        : name === 'maxHourlyRate'
        ? parseFloat(value) || 0.0
        : value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      setSubmittingEdit(true);
      setError('');
      await updateRequisition(selectedReq.id, editForm);
      showToast(`Requisition ${selectedReq.id} updated successfully!`, 'success');
      setShowEditModal(false);
      loadRequisitions();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'open') return 'success';
    if (s === 'draft') return 'pending';
    if (s === 'filled') return 'info';
    if (s === 'closed') return 'secondary';
    return 'danger'; // CANCELLED
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="page-title mb-1">My Requisitions</h1>
          <p className="muted-text">Monitor job postings, publish drafts, and track hire demands.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            className="enterprise-form-select"
            style={{ width: '200px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open (Published)</option>
            <option value="FILLED">Filled</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Loading requisitions..." />
      ) : (
        <div>
          {requisitions.length > 0 ? (
            <Table headers={['Job ID', 'Title', 'Core Skill', 'Quantity', 'Rate Limit', 'Status', 'Actions']}>
              {requisitions.map((req) => (
                <tr key={req.id}>
                  <td className="fw-bold">{req.id}</td>
                  <td>
                    <div className="fw-semibold text-dark">{req.title}</div>
                    <div className="text-muted small" style={{ fontSize: '11px' }}>{req.experienceLevel} &bull; {req.engagementType}</div>
                  </td>
                  <td>
                    <span className="status-pill info">{req.requiredSkillName || 'Skill'}</span>
                  </td>
                  <td className="fw-semibold">{req.quantity}</td>
                  <td className="text-success fw-bold">₹{req.maxHourlyRate}/hr</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2 justify-content-start">
                      <button className="btn-enterprise-secondary py-1 px-3" onClick={() => { setSelectedReq(req); setShowViewModal(true); }}>
                        View
                      </button>
                      
                      {req.status === 'DRAFT' && (
                        <>
                          <button className="btn-enterprise-secondary py-1 px-3" onClick={() => openEdit(req)}>
                            Edit
                          </button>
                          <button className="btn-enterprise-primary py-1 px-3" onClick={() => handlePublish(req.id)}>
                            Publish
                          </button>
                        </>
                      )}

                      {(req.status === 'DRAFT' || req.status === 'OPEN') && (
                        <button className="btn-enterprise-ghost text-danger py-1 px-3 border-0" onClick={() => handleCancel(req.id)}>
                          Cancel
                        </button>
                      )}

                      {req.status === 'OPEN' && (
                        <button className="btn-enterprise-secondary py-1 px-3" onClick={() => handleClose(req.id)}>
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="enterprise-table-container p-5 text-center text-muted">
              <i className="bi bi-journal-x fs-2"></i>
              <p className="small mt-2 mb-0">No job requisitions logged. Click New Requisition to add one.</p>
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

      {/* Details View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Job Requisition Details ({selectedReq?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {selectedReq && (
            <Row className="g-3">
              <Col md={6}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Job Title</div>
                <div className="fw-bold fs-5 text-dark">{selectedReq.title}</div>
              </Col>
              <Col md={6}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Status</div>
                <div className="mt-1">
                  <span className={`status-pill ${getStatusClass(selectedReq.status)}`}>
                    {selectedReq.status}
                  </span>
                </div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Experience Level</div>
                <div className="fw-semibold text-dark">{selectedReq.experienceLevel} &bull; {selectedReq.minExperienceYears}+ yrs</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Employment Type</div>
                <div className="fw-semibold text-dark">{selectedReq.engagementType}</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Core Skill</div>
                <div className="fw-semibold text-dark">{selectedReq.requiredSkillName || 'Core Tech'}</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Quantity Needed</div>
                <div className="fw-semibold text-dark">{selectedReq.quantity} Positions</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Max Hourly Rate</div>
                <div className="fw-semibold text-success">₹{selectedReq.maxHourlyRate}/hr</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Duration</div>
                <div className="fw-semibold text-dark">{selectedReq.duration}</div>
              </Col>
              <Col md={12}>
                <hr />
                <div className="small text-muted text-uppercase font-bold mb-2" style={{ fontSize: '10px' }}>Job Description</div>
                <p className="bg-light p-3 rounded text-dark small" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedReq.description || 'No description provided.'}
                </p>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowViewModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal (only allowed in DRAFT) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Edit Requisition ({selectedReq?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {editForm && (
            <Form onSubmit={(e) => e.preventDefault()}>
              <Row className="g-3">
                <Col md={12}>
                  <Form.Group controlId="editTitle">
                    <Form.Label className="enterprise-form-label">Job Title</Form.Label>
                    <Form.Control type="text" name="title" value={editForm.title} onChange={handleEditChange} className="enterprise-form-control" required />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editSkill">
                    <Form.Label className="enterprise-form-label">Core Skill</Form.Label>
                    <Form.Select name="requiredSkillId" value={editForm.requiredSkillId} onChange={handleEditChange} className="enterprise-form-select">
                      {skills.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editEngagement">
                    <Form.Label className="enterprise-form-label">Employment Type</Form.Label>
                    <Form.Select name="engagementType" value={editForm.engagementType} onChange={handleEditChange} className="enterprise-form-select">
                      <option value="ONSITE">On-Site</option>
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editExpLevel">
                    <Form.Label className="enterprise-form-label">Experience Level</Form.Label>
                    <Form.Select name="experienceLevel" value={editForm.experienceLevel} onChange={handleEditChange} className="enterprise-form-select">
                      <option value="JUNIOR">Junior (1-3 yrs)</option>
                      <option value="MID">Mid-Level (3-5 yrs)</option>
                      <option value="SENIOR">Senior (5+ yrs)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editMinExp">
                    <Form.Label className="enterprise-form-label">Min Exp (Years)</Form.Label>
                    <Form.Control type="number" name="minExperienceYears" value={editForm.minExperienceYears} onChange={handleEditChange} className="enterprise-form-control" min={0} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editQuantity">
                    <Form.Label className="enterprise-form-label">Positions Required</Form.Label>
                    <Form.Control type="number" name="quantity" value={editForm.quantity} onChange={handleEditChange} className="enterprise-form-control" min={1} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editRate">
                    <Form.Label className="enterprise-form-label">Max Rate (₹ / Hr)</Form.Label>
                    <Form.Control type="number" step="0.01" name="maxHourlyRate" value={editForm.maxHourlyRate} onChange={handleEditChange} className="enterprise-form-control" min={0.01} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editStartDate">
                    <Form.Label className="enterprise-form-label">Start Date</Form.Label>
                    <Form.Control type="date" name="startDate" value={editForm.startDate} onChange={handleEditChange} className="enterprise-form-control" />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="editDesc">
                    <Form.Label className="enterprise-form-label">Job Description</Form.Label>
                    <Form.Control as="textarea" rows={3} name="description" value={editForm.description} onChange={handleEditChange} className="enterprise-form-control" maxLength={1000} />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleSaveEdit} disabled={submittingEdit}>
            {submittingEdit ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default MyRequisitions;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Row, Col, Alert, Spinner, Pagination } from 'react-bootstrap';
import { getRequisitions, publishRequisition, cancelRequisition, closeRequisition, updateRequisition } from '../../services/requisitionService';
import { getSkills } from '../../services/contractorService';
import { getErrorMessage } from '../../services/errorUtils';

function MyRequisitions() {
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
      setSuccess('');
      await publishRequisition(id);
      setSuccess(`Requisition ${id} published successfully!`);
      loadRequisitions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleCancel = async (id) => {
    try {
      setError('');
      setSuccess('');
      await cancelRequisition(id);
      setSuccess(`Requisition ${id} cancelled successfully!`);
      loadRequisitions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClose = async (id) => {
    try {
      setError('');
      setSuccess('');
      await closeRequisition(id);
      setSuccess(`Requisition ${id} closed successfully!`);
      loadRequisitions();
    } catch (err) {
      setError(getErrorMessage(err));
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
      businessUnitId: req.businessUnitId || 'bu1',
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
      setSuccess(`Requisition ${selectedReq.id} updated successfully!`);
      setShowEditModal(false);
      loadRequisitions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">My Requisitions</h2>
          <p className="text-muted small mt-1 mb-0">Monitor job postings, publish drafts, and track hire demands.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            style={{ width: '180px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open (Published)</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading requisitions...</p>
        </div>
      ) : (
        <div className="gf-card p-0 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Job ID</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Core Skill</th>
                  <th>Quantity</th>
                  <th>Rate Limit</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.length > 0 ? (
                  requisitions.map((req) => (
                    <tr key={req.id}>
                      <td className="fw-bold">{req.id}</td>
                      <td>
                        <div className="fw-semibold text-slate-800">{req.title}</div>
                        <div className="text-muted style-small" style={{ fontSize: '0.75rem' }}>{req.experienceLevel} &bull; {req.engagementType}</div>
                      </td>
                      <td>{req.businessUnitId === 'bu1' ? 'Engineering' : req.businessUnitId === 'bu2' ? 'Product Ops' : req.businessUnitId === 'bu3' ? 'Finance' : 'Infrastructure'}</td>
                      <td><span className="gf-badge badge-info">{req.requiredSkillName || 'Skill'}</span></td>
                      <td className="fw-semibold">{req.quantity}</td>
                      <td className="text-green-600 fw-bold">${req.maxHourlyRate}/hr</td>
                      <td>
                        <span className={`gf-badge badge-${req.status.toLowerCase() === 'open' ? 'approved' : req.status.toLowerCase() === 'draft' ? 'pending' : 'rejected'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button size="sm" variant="outline-primary" onClick={() => { setSelectedReq(req); setShowViewModal(true); }}>
                            View
                          </Button>
                          
                          {req.status === 'DRAFT' && (
                            <>
                              <Button size="sm" variant="outline-success" onClick={() => openEdit(req)}>
                                Edit
                              </Button>
                              <Button size="sm" className="btn-gf-primary" onClick={() => handlePublish(req.id)}>
                                Publish
                              </Button>
                            </>
                          )}

                          {(req.status === 'DRAFT' || req.status === 'OPEN') && (
                            <Button size="sm" variant="outline-danger" onClick={() => handleCancel(req.id)}>
                              Cancel
                            </Button>
                          )}

                          {req.status === 'OPEN' && (
                            <Button size="sm" variant="outline-secondary" onClick={() => handleClose(req.id)}>
                              Close
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No job requisitions logged. Click New Requisition to add one.
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

      {/* Details View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Job Requisition Details ({selectedReq?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReq && (
            <Row className="g-3">
              <Col md={6}>
                <div className="small text-muted text-uppercase font-bold">Job Title</div>
                <div className="fw-bold fs-5 text-slate-800">{selectedReq.title}</div>
              </Col>
              <Col md={6}>
                <div className="small text-muted text-uppercase font-bold">Status</div>
                <div className="mt-1">
                  <span className={`gf-badge badge-${selectedReq.status.toLowerCase() === 'open' ? 'approved' : selectedReq.status.toLowerCase() === 'draft' ? 'pending' : 'rejected'}`}>
                    {selectedReq.status}
                  </span>
                </div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold">Experience Level</div>
                <div className="fw-semibold">{selectedReq.experienceLevel} &bull; {selectedReq.minExperienceYears}+ yrs</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold">Employment Type</div>
                <div className="fw-semibold">{selectedReq.engagementType}</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold">Core Skill</div>
                <div className="fw-semibold">{selectedReq.requiredSkillName || 'Core Tech'}</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold">Quantity Needed</div>
                <div className="fw-semibold">{selectedReq.quantity} Positions</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold">Max Hourly Rate</div>
                <div className="fw-semibold text-green-600">${selectedReq.maxHourlyRate}/hr</div>
              </Col>
              <Col md={4}>
                <div className="small text-muted text-uppercase font-bold">Duration</div>
                <div className="fw-semibold">{selectedReq.duration}</div>
              </Col>
              <Col md={12}>
                <hr />
                <div className="small text-muted text-uppercase font-bold mb-2">Job Description</div>
                <p className="bg-light p-3 rounded text-slate-700" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedReq.description || 'No description provided.'}
                </p>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal (only allowed in DRAFT) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Edit Requisition ({selectedReq?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editForm && (
            <Form onSubmit={(e) => e.preventDefault()}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="editTitle">
                    <Form.Label className="uppercase-label">Job Title</Form.Label>
                    <Form.Control type="text" name="title" value={editForm.title} onChange={handleEditChange} required />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="editBU">
                    <Form.Label className="uppercase-label">Business Unit</Form.Label>
                    <Form.Select name="businessUnitId" value={editForm.businessUnitId} onChange={handleEditChange}>
                      <option value="bu1">Engineering</option>
                      <option value="bu2">Product Operations</option>
                      <option value="bu3">Corporate Finance</option>
                      <option value="bu4">Infrastructure & Cloud</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editSkill">
                    <Form.Label className="uppercase-label">Core Skill</Form.Label>
                    <Form.Select name="requiredSkillId" value={editForm.requiredSkillId} onChange={handleEditChange}>
                      {skills.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editEngagement">
                    <Form.Label className="uppercase-label">Employment Type</Form.Label>
                    <Form.Select name="engagementType" value={editForm.engagementType} onChange={handleEditChange}>
                      <option value="ONSITE">On-Site</option>
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="editExpLevel">
                    <Form.Label className="uppercase-label">Experience Level</Form.Label>
                    <Form.Select name="experienceLevel" value={editForm.experienceLevel} onChange={handleEditChange}>
                      <option value="JUNIOR">Junior (1-3 yrs)</option>
                      <option value="MID">Mid-Level (3-5 yrs)</option>
                      <option value="SENIOR">Senior (5+ yrs)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editMinExp">
                    <Form.Label className="uppercase-label">Min Exp (Years)</Form.Label>
                    <Form.Control type="number" name="minExperienceYears" value={editForm.minExperienceYears} onChange={handleEditChange} min={0} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editQuantity">
                    <Form.Label className="uppercase-label">Positions Required</Form.Label>
                    <Form.Control type="number" name="quantity" value={editForm.quantity} onChange={handleEditChange} min={1} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editRate">
                    <Form.Label className="uppercase-label">Max Rate ($ / Hr)</Form.Label>
                    <Form.Control type="number" step="0.01" name="maxHourlyRate" value={editForm.maxHourlyRate} onChange={handleEditChange} min={0.01} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="editStartDate">
                    <Form.Label className="uppercase-label">Start Date</Form.Label>
                    <Form.Control type="date" name="startDate" value={editForm.startDate} onChange={handleEditChange} />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="editDesc">
                    <Form.Label className="uppercase-label">Job Description</Form.Label>
                    <Form.Control as="textarea" rows={3} name="description" value={editForm.description} onChange={handleEditChange} maxLength={1000} />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleSaveEdit} disabled={submittingEdit}>
            {submittingEdit ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default MyRequisitions;

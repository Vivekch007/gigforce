import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Form, Modal, Row, Col } from 'react-bootstrap';
import { getCandidates, addCandidate, updateCandidate, deleteCandidate, uploadCandidateResume } from '../../services/candidateService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import CandidateCard from '../../components/vendor/CandidateCard';
import Loader from '../../components/Loader';

function CandidateDatabase() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Candidates list
  const [candidates, setCandidates] = useState([]);

  // Modal forms
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    skills: '',
    experience: '',
    noticePeriod: 'Immediate',
    currentCompany: '',
    preferredLocation: 'Remote',
    availability: 'AVAILABLE',
    rate: '',
  });

  // Resume Upload Modal
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeCand, setResumeCand] = useState(null);
  const [selectedFile, setSelectedFile] = useState('');

  const loadCandidatesData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCandidates();
      setCandidates(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidatesData();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      skills: '',
      experience: '',
      noticePeriod: 'Immediate',
      currentCompany: '',
      preferredLocation: 'Remote',
      availability: 'AVAILABLE',
      rate: '',
    });
    setShowAddEditModal(true);
  };

  const openEditModal = (c) => {
    setModalMode('edit');
    setEditingId(c.id);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone,
      skills: c.skills,
      experience: c.experience,
      noticePeriod: c.noticePeriod,
      currentCompany: c.currentCompany || '',
      preferredLocation: c.preferredLocation,
      availability: c.availability,
      rate: c.rate,
    });
    setShowAddEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.skills || !formData.rate) {
      setError('Please fill in name, email, skills, and daily rate.');
      if (window.showToast) window.showToast('Please fill in required fields.', 'warning');
      return;
    }

    try {
      setError('');
      const payload = {
        ...formData,
        experience: parseInt(formData.experience || 0),
        rate: parseFloat(formData.rate),
      };

      if (modalMode === 'add') {
        await addCandidate(payload);
        if (window.showToast) window.showToast('Candidate added to database successfully.', 'success');
      } else {
        await updateCandidate(editingId, payload);
        if (window.showToast) window.showToast('Candidate details updated successfully.', 'success');
      }

      setShowAddEditModal(false);
      loadCandidatesData();
    } catch (err) {
      setError(getErrorMessage(err));
      if (window.showToast) window.showToast(getErrorMessage(err), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate from your database?')) return;
    try {
      setError('');
      await deleteCandidate(id);
      if (window.showToast) window.showToast('Candidate deleted from database.', 'info');
      loadCandidatesData();
    } catch (err) {
      setError(getErrorMessage(err));
      if (window.showToast) window.showToast(getErrorMessage(err), 'error');
    }
  };

  const openResumeModal = (cand) => {
    setResumeCand(cand);
    setSelectedFile('');
    setShowResumeModal(true);
  };

  const handleUploadResume = async () => {
    if (!selectedFile) {
      setError('Please type or select a file name to simulate upload.');
      if (window.showToast) window.showToast('Please type a filename.', 'warning');
      return;
    }
    try {
      setError('');
      await uploadCandidateResume(resumeCand.id, selectedFile);
      if (window.showToast) window.showToast(`Resume "${selectedFile}" linked for candidate: ${resumeCand.name}!`, 'success');
      setShowResumeModal(false);
      loadCandidatesData();
    } catch (err) {
      setError(getErrorMessage(err));
      if (window.showToast) window.showToast(getErrorMessage(err), 'error');
    }
  };

  // Local Search filtering
  const filteredCandidates = candidates.filter(c => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.skills.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="page-title mb-1">Candidate Database</h1>
          <p className="muted-text">Manage your staffing pool, edit qualifications, and upload resume documents.</p>
        </div>
        {candidates.length > 0 && (
          <button className="btn-enterprise-primary" onClick={openAddModal}>
            <i className="bi bi-person-plus me-2"></i> Add Candidate
          </button>
        )}
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Accessing candidate records..." />
      ) : filteredCandidates.length > 0 ? (
        <Row className="g-4">
          {filteredCandidates.map(c => (
            <Col lg={4} md={6} key={c.id}>
              <CandidateCard
                candidate={c}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onUploadResume={openResumeModal}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-people fs-1 text-muted"></i>
          <h5 className="fw-semibold mt-3 text-dark">No candidates registered in database</h5>
          <p className="text-muted small mb-4">Start by adding your candidate profiles to submit to open requisitions.</p>
          <button className="btn-enterprise-primary" onClick={openAddModal}>
            <i className="bi bi-person-plus me-2"></i> Add Candidate
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal show={showAddEditModal} onHide={() => setShowAddEditModal(false)} centered size="lg" className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">
            {modalMode === 'add' ? 'Add New Candidate' : 'Edit Candidate Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          <Form onSubmit={handleSave}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="name">
                  <Form.Label className="enterprise-form-label">Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    className="enterprise-form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="email">
                  <Form.Label className="enterprise-form-label">Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    required
                    className="enterprise-form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="phone">
                  <Form.Label className="enterprise-form-label">Phone Number</Form.Label>
                  <Form.Control
                    type="text"
                    className="enterprise-form-control"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="currentCompany">
                  <Form.Label className="enterprise-form-label">Current Company</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Freelance"
                    className="enterprise-form-control"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="skills">
                  <Form.Label className="enterprise-form-label">Skills (Comma Separated)</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="e.g. React, Spring Boot, AWS"
                    className="enterprise-form-control"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="experience">
                  <Form.Label className="enterprise-form-label">Experience (Years)</Form.Label>
                  <Form.Control
                    type="number"
                    className="enterprise-form-control"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="noticePeriod">
                  <Form.Label className="enterprise-form-label">Notice Period</Form.Label>
                  <Form.Select
                    value={formData.noticePeriod}
                    className="enterprise-form-select"
                    onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="preferredLocation">
                  <Form.Label className="enterprise-form-label">Preferred Location</Form.Label>
                  <Form.Select
                    value={formData.preferredLocation}
                    className="enterprise-form-select"
                    onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                  >
                    <option value="Remote">Remote</option>
                    <option value="On-Site">On-Site</option>
                    <option value="Hybrid">Hybrid</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="rate">
                  <Form.Label className="enterprise-form-label">Preferred Daily Rate (₹/day)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    className="enterprise-form-control"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="availability">
                  <Form.Label className="enterprise-form-label">Availability Status</Form.Label>
                  <Form.Select
                    value={formData.availability}
                    className="enterprise-form-select"
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ENGAGED">ENGAGED</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn-enterprise-secondary" onClick={() => setShowAddEditModal(false)}>Cancel</button>
              <button type="submit" className="btn-enterprise-primary">Save Candidate</button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Resume Upload Modal */}
      <Modal show={showResumeModal} onHide={() => setShowResumeModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Simulated Resume Linker</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {resumeCand && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Linking resume for:</span>
                <h6 className="fw-bold text-dark mt-1">{resumeCand.name}</h6>
              </div>

              {resumeCand.resumeUrl && (
                <div className="alert alert-success py-2 small mb-3">
                  Current file: <strong>{resumeCand.resumeUrl}</strong>
                </div>
              )}

              <Form.Group controlId="fileName">
                <Form.Label className="enterprise-form-label">Enter PDF Filename</Form.Label>
                <Form.Control
                  type="text"
                  className="enterprise-form-control"
                  placeholder="e.g. resume_john_doe_v2.pdf"
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowResumeModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleUploadResume}>Link Resume</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CandidateDatabase;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Form, Modal, Row, Col } from 'react-bootstrap';
import { getCandidates, addCandidate, updateCandidate, deleteCandidate, uploadCandidateResume } from '../../services/candidateService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import CandidateCard from '../../components/vendor/CandidateCard';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function CandidateDatabase() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      return;
    }

    try {
      setError('');
      setSuccess('');
      const payload = {
        ...formData,
        experience: parseInt(formData.experience || 0),
        rate: parseFloat(formData.rate),
      };

      if (modalMode === 'add') {
        await addCandidate(payload);
        setSuccess('Candidate added to database successfully.');
      } else {
        await updateCandidate(editingId, payload);
        setSuccess('Candidate details updated successfully.');
      }

      setShowAddEditModal(false);
      loadCandidatesData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate from your database?')) return;
    try {
      setError('');
      setSuccess('');
      await deleteCandidate(id);
      setSuccess('Candidate deleted from database.');
      loadCandidatesData();
    } catch (err) {
      setError(getErrorMessage(err));
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
      return;
    }
    try {
      setError('');
      setSuccess('');
      await uploadCandidateResume(resumeCand.id, selectedFile);
      setSuccess(`Resume "${selectedFile}" linked for candidate: ${resumeCand.name}!`);
      setShowResumeModal(false);
      loadCandidatesData();
    } catch (err) {
      setError(getErrorMessage(err));
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
          <h2 className="fw-black text-slate-800 mb-0">Candidate Database</h2>
          <p className="text-muted small mt-1 mb-0">Manage your staffing pool, edit qualifications, and upload resume documents.</p>
        </div>
        <Button className="btn-gf-primary" onClick={openAddModal}>➕ Add Candidate</Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Accessing candidate records..." />
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
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">👥</span>
          <p className="text-muted small mt-2 mb-0">No candidates registered in database.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal show={showAddEditModal} onHide={() => setShowAddEditModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {modalMode === 'add' ? 'Add New Candidate' : 'Edit Candidate Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="name">
                  <Form.Label className="uppercase-label">Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="email">
                  <Form.Label className="uppercase-label">Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="phone">
                  <Form.Label className="uppercase-label">Phone Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="currentCompany">
                  <Form.Label className="uppercase-label">Current Company</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Freelance"
                    value={formData.currentCompany}
                    onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="skills">
                  <Form.Label className="uppercase-label">Skills (Comma Separated)</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder="e.g. React, Spring Boot, AWS"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="experience">
                  <Form.Label className="uppercase-label">Experience (Years)</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="noticePeriod">
                  <Form.Label className="uppercase-label">Notice Period</Form.Label>
                  <Form.Select
                    value={formData.noticePeriod}
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
                  <Form.Label className="uppercase-label">Preferred Location</Form.Label>
                  <Form.Select
                    value={formData.preferredLocation}
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
                  <Form.Label className="uppercase-label">Preferred Daily Rate ($/day)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="availability">
                  <Form.Label className="uppercase-label">Availability Status</Form.Label>
                  <Form.Select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ENGAGED">ENGAGED</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowAddEditModal(false)}>Cancel</Button>
              <Button className="btn-gf-primary" type="submit">Save Candidate</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Resume Upload Modal */}
      <Modal show={showResumeModal} onHide={() => setShowResumeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Simulated Resume Linker</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {resumeCand && (
            <div>
              <div className="mb-3">
                <span className="text-muted text-xs">Linking resume for:</span>
                <h6 className="fw-bold text-slate-800">{resumeCand.name}</h6>
              </div>

              {resumeCand.resumeUrl && (
                <div className="alert alert-success py-2 text-xs mb-3">
                  Current file: <strong>{resumeCand.resumeUrl}</strong>
                </div>
              )}

              <Form.Group controlId="fileName">
                <Form.Label className="uppercase-label">Enter PDF Filename</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. resume_john_doe_v2.pdf"
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResumeModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleUploadResume}>Link Resume</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CandidateDatabase;

import React, { useEffect, useState } from 'react';
import { Spinner, Alert, Button, Form, Col, Row, Card, Badge, Table, Modal } from 'react-bootstrap';
import {
  getMyProfile,
  updateProfile,
  getSkills,
  addProfileSkill,
  deleteProfileSkill,
  getProfileCerts,
  addProfileCert,
  deleteProfileCert,
  getProfileEngagements,
  addProfileEngagement
} from '../../services/contractorService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import '../../styles/contractor.css';

function Profile() {
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [activeTab, setActiveTab] = useState('personal'); // personal | skills | certs | engagements

  // Tab Loading and Error states
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Tab Specific Data
  const [personalForm, setPersonalForm] = useState({
    displayName: '',
    hourlyRate: '',
    experienceYears: '',
    preferredEngagementType: 'HYBRID',
    availabilityStatus: 'AVAILABLE',
    phone: '',
    address: '',
  });

  const [skillsCatalog, setSkillsCatalog] = useState([]);
  const [skillForm, setSkillForm] = useState({
    skillId: '',
    proficiencyLevel: 'BEGINNER',
    yearsOfExperience: '',
  });

  const [certifications, setCertifications] = useState([]);
  const [certForm, setCertForm] = useState({
    name: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
  });
  const [showCertModal, setShowCertModal] = useState(false);

  const [engagements, setEngagements] = useState([]);
  const [engForm, setEngForm] = useState({
    clientName: '',
    roleTitle: '',
    startDate: '',
    endDate: '',
    rating: '5',
    feedback: '',
    verifyer_name: '',
    verifyer_email: '',
    verifyer_phone: '',
  });
  const [showEngModal, setShowEngModal] = useState(false);

  // 1. Initial Load: Fetch main profile context
  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError('');
        const data = await getMyProfile();
        if (active) {
          setProfile(data);
          setPersonalForm({
            displayName: data.displayName || '',
            hourlyRate: data.hourlyRate || '',
            experienceYears: data.experienceYears || '0',
            preferredEngagementType: data.preferredEngagementType || 'HYBRID',
            availabilityStatus: data.availabilityStatus || 'AVAILABLE',
            phone: data.phone || '',
            address: data.address || '',
          });
        }
      } catch (err) {
        if (active) {
          setProfileError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };
    loadProfile();
    return () => { active = false; };
  }, []);

  // 2. Tab Switch Load: Load tab details independently
  useEffect(() => {
    if (!profile) return;
    let active = true;

    const loadTabDetails = async () => {
      try {
        setTabLoading(true);

        if (activeTab === 'personal') {
          // Profile context contains personal info; no additional fetch needed
        } else if (activeTab === 'skills') {
          // Fetch overall skills database for addition dropdown
          const allSkills = await getSkills();
          if (active) setSkillsCatalog(allSkills);
        } else if (activeTab === 'certs') {
          // Fetch certifications list
          const certs = await getProfileCerts(profile.id);
          if (active) setCertifications(certs);
        } else if (activeTab === 'engagements') {
          // Fetch engagement history logs
          const engs = await getProfileEngagements(profile.id);
          if (active) setEngagements(engs);
        }
      } catch (err) {
        if (active) setTabError(getErrorMessage(err));
      } finally {
        if (active) setTabLoading(false);
      }
    };

    loadTabDetails();
    return () => { active = false; };
  }, [activeTab, profile]);

  if (profileLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading profile context...</span>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="text-center py-5 mt-5">
        <i className="bi bi-exclamation-triangle fs-1 text-danger mb-3"></i>
        <h5>Profile Error</h5>
      </div>
    );
  }

  // Derive title from first skill or defaults
  const mainTitle = profile?.skills?.length > 0
    ? `${profile.skills[0].skillName} Engineer`
    : 'Contractor Specialist';

  // --- Handlers ---

  // Personal Info Save
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const updated = await updateProfile(profile.id, {
        ...personalForm,
        hourlyRate: parseFloat(personalForm.hourlyRate),
        experienceYears: parseInt(personalForm.experienceYears, 10),
      });
      setProfile(updated);
      showToast('Personal details updated successfully!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Skill Add
  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!skillForm.skillId) {
      showToast('Please select a skill from the list', 'danger');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await addProfileSkill(profile.id, {
        skillId: skillForm.skillId,
        proficiencyLevel: skillForm.proficiencyLevel,
        yearsOfExperience: parseInt(skillForm.yearsOfExperience || '0', 10),
      });
      setProfile(updated);
      setSkillForm({ skillId: '', proficiencyLevel: 'BEGINNER', yearsOfExperience: '' });
      showToast('Skill mapped successfully!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Skill Delete
  const handleDeleteSkill = async (skillId) => {
    const confirmed = await showConfirmation({ title: 'Remove Skill', message: 'Are you sure you want to remove this skill?' });
    if (!confirmed) return;
    setActionLoading(true);
    setTabError('');
    try {
      await deleteProfileSkill(profile.id, skillId);
      // Refresh profile state
      const updated = await getMyProfile();
      setProfile(updated);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cert Add
  const handleAddCert = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await addProfileCert(profile.id, certForm);
      const certs = await getProfileCerts(profile.id);
      setCertifications(certs);
      setShowCertModal(false);
      setCertForm({ name: '', issuingAuthority: '', issueDate: '', expiryDate: '', certificateNumber: '' });
      showToast('Certification added successfully!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cert Delete
  const handleDeleteCert = async (certId) => {
    const confirmed = await showConfirmation({ title: 'Remove Certification', message: 'Are you sure you want to remove this certification?' });
    if (!confirmed) return;
    setActionLoading(true);
    setTabError('');
    try {
      await deleteProfileCert(profile.id, certId);
      const certs = await getProfileCerts(profile.id);
      setCertifications(certs);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Engagement Add
  const handleAddEngagement = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setTabError('');
    try {
      await addProfileEngagement(profile.id, {
        ...engForm,
        rating: engForm.rating ? parseInt(engForm.rating, 10) : null,
        endDate: engForm.endDate || null,
      });
      const engs = await getProfileEngagements(profile.id);
      setEngagements(engs);
      setShowEngModal(false);
      setEngForm({
        clientName: '',
        roleTitle: '',
        startDate: '',
        endDate: '',
        rating: '5',
        feedback: '',
        verifyer_name: '',
        verifyer_email: '',
        verifyer_phone: '',
      });
      showToast('Engagement logged for verification!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Star visualizer helper
  const renderStars = (levelOrRating) => {
    let stars = 0;
    if (levelOrRating === 'EXPERT') stars = 5;
    else if (levelOrRating === 'INTERMEDIATE') stars = 4;
    else if (levelOrRating === 'BEGINNER') stars = 3;
    else stars = parseInt(levelOrRating || '0', 10);

    return (
      <span className="text-warning">
        {'★'.repeat(stars)}
        {'☆'.repeat(Math.max(0, 5 - stars))}
      </span>
    );
  };

  return (
    <div className="container-fluid">
      {/* Profile Header Card */}
      <div className="gf-card mb-4 p-4">

        <div className="d-flex align-items-center gap-4 flex-wrap">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="96"
            height="96"
            fill="#6c757d"
            className="bi bi-person-fill"
            viewBox="0 0 16 16"
          >
            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
          </svg>
          <div>
            <h3 className="fw-black text-slate-800 mb-1">{profile.displayName || profile.userName}</h3>
            <p className="text-muted mb-2 fw-medium">{mainTitle}</p>
            <span className={`gf-badge badge-${profile.availabilityStatus.toLowerCase()}`}>
              {profile.availabilityStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="gf-nav-tabs">
        <button
          onClick={() => setActiveTab('personal')}
          className={`gf-nav-tab ${activeTab === 'personal' ? 'active' : ''}`}
        >
          <i className="bi bi-person-fill me-2"></i>Personal Info
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`gf-nav-tab ${activeTab === 'skills' ? 'active' : ''}`}
        >
          <i className="bi bi-lightning-fill me-2"></i>Skills
        </button>
        <button
          onClick={() => setActiveTab('certs')}
          className={`gf-nav-tab ${activeTab === 'certs' ? 'active' : ''}`}
        >
          <i className="bi bi-file-earmark-check-fill me-2"></i>Certifications
        </button>
        <button
          onClick={() => setActiveTab('engagements')}
          className={`gf-nav-tab ${activeTab === 'engagements' ? 'active' : ''}`}
        >
          <i className="bi bi-briefcase-fill me-2"></i>Engagement History
        </button>
      </div>

      {/* Independent Tab Content Rendering */}
      {tabLoading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <div>


          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'personal' && (
            <Card className="gf-card border-0">
              <Form onSubmit={handlePersonalSubmit}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profileDispName">
                      <Form.Label className="uppercase-label">Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={personalForm.displayName}
                        disabled
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profileEmail">
                      <Form.Label className="uppercase-label">Email Address (Read-only)</Form.Label>
                      <Form.Control type="email" value={profile.userEmail} disabled />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profilePhone">
                      <Form.Label className="uppercase-label">Phone</Form.Label>
                      <Form.Control
                        type="text"
                        value={personalForm.phone}
                        maxLength = {15}
                        onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profileExperience">
                      <Form.Label className="uppercase-label">Experience Years</Form.Label>
                      <Form.Control
                        type="text"
                        value={personalForm.experienceYears}
                        onChange={(e) => setPersonalForm({ ...personalForm, experienceYears: e.target.value })}
                        min="0"
                        maxLength = {2}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profileRate">
                      <Form.Label className="uppercase-label">Hourly Rate (₹)</Form.Label>
                      <Form.Control
                        type="text"
                        value={personalForm.hourlyRate}
                        onChange={(e) => setPersonalForm({ ...personalForm, hourlyRate: e.target.value })}
                        step="0.01"
                        maxLength={15}
                        min="0.01"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profilePreferred">
                      <Form.Label className="uppercase-label">Preferred Engagement</Form.Label>
                      <Form.Select
                        value={personalForm.preferredEngagementType}
                        onChange={(e) => setPersonalForm({ ...personalForm, preferredEngagementType: e.target.value })}
                      >
                        <option value="REMOTE">Remote</option>
                        <option value="ONSITE">Onsite</option>
                        <option value="HYBRID">Hybrid</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="profileAvailability">
                      <Form.Label className="uppercase-label">Availability Status</Form.Label>
                      <Form.Select
                        value={personalForm.availabilityStatus}
                        onChange={(e) => setPersonalForm({ ...personalForm, availabilityStatus: e.target.value })}
                        disabled
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="ON_ASSIGNMENT">On Assignment</option>
                        <option value="ON_NOTICE">On Notice</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3" controlId="profileAddress">
                      <Form.Label className="uppercase-label">Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={personalForm.address}
                        onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end mt-3">
                  <Button type="submit" className="btn-gf-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Details'}
                  </Button>
                </div>
              </Form>
            </Card>
          )}

          {/* TAB 2: SKILLS */}
          {activeTab === 'skills' && (
            <Card className="gf-card border-0">
              <h5 className="fw-bold text-slate-800 mb-4">Add Skills</h5>
              <Form onSubmit={handleAddSkill} className="row g-3 align-items-end mb-5">
                <Col md={4}>
                  <Form.Group controlId="addSkillSelect">
                    <Form.Label className="uppercase-label">Skill</Form.Label>
                    <Form.Select
                      value={skillForm.skillId}
                      onChange={(e) => setSkillForm({ ...skillForm, skillId: e.target.value })}
                    >
                      <option value="">Select Skill...</option>
                      {skillsCatalog.map((sk) => (
                        <option key={sk.id} value={sk.id}>{sk.name} ({sk.category})</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="addSkillProficiency">
                    <Form.Label className="uppercase-label">Proficiency</Form.Label>
                    <Form.Select
                      value={skillForm.proficiencyLevel}
                      onChange={(e) => setSkillForm({ ...skillForm, proficiencyLevel: e.target.value })}
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="EXPERT">Expert</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group controlId="addSkillExperience">
                    <Form.Label className="uppercase-label">Experience (Years)</Form.Label>
                    <Form.Control
                      type="number"
                      value={skillForm.yearsOfExperience}
                      onChange={(e) => setSkillForm({ ...skillForm, yearsOfExperience: e.target.value })}
                      min="0"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Button type="submit" className="btn-gf-primary w-100" disabled={actionLoading}>
                    Add Skill
                  </Button>
                </Col>
              </Form>

              <hr />

              <h5 className="fw-bold text-slate-800 mb-4 mt-3">My Skills</h5>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="row row-cols-1 row-cols-md-2 g-3">
                  {profile.skills.map((skill) => (
                    <Col key={skill.skillId}>
                      <div className="p-3 border rounded-3 d-flex justify-content-between align-items-center bg-light">
                        <div>
                          <h6 className="fw-bold text-slate-800 mb-1">{skill.skillName}</h6>
                          <div className="small mb-1">{renderStars(skill.proficiencyLevel)} ({skill.proficiencyLevel.toLowerCase()})</div>
                          <span className="text-muted small">{skill.yearsOfExperience} Years Experience</span>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteSkill(skill.skillId)}
                          disabled={actionLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    </Col>
                  ))}
                </div>
              ) : (
                <p className="text-muted small">No skills associated with your profile.</p>
              )}
            </Card>
          )}

          {/* TAB 3: CERTIFICATIONS */}
          {activeTab === 'certs' && (
            <Card className="gf-card border-0">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-slate-800 mb-0">My Certifications</h5>
                <Button className="btn-gf-primary" onClick={() => setShowCertModal(true)}>
                  + Add Certification
                </Button>
              </div>

              {certifications.length > 0 ? (
                <div className="row row-cols-1 row-cols-md-3 g-3">
                  {certifications.map((cert) => (
                    <Col key={cert.id}>
                      <Card className="p-3 border rounded-3 h-100 bg-light position-relative">
                        <h6 className="fw-bold text-slate-800 mb-1 pe-4">{cert.name}</h6>
                        <span className="text-muted small mb-2">Issued by: {cert.issuingAuthority}</span>
                        <div className="mb-2">
                          <span className={`gf-badge badge-${cert.certStatus.toLowerCase()}`}>
                            {cert.certStatus}
                          </span>
                        </div>
                        <div className="mt-auto pt-2 text-xs text-muted d-flex flex-column">
                          <span>Issued: {cert.issueDate}</span>
                          <span>Expires: {cert.expiryDate || 'Never'}</span>
                        </div>

                        <Button
                          variant="link"
                          className="text-danger p-0 border-0 position-absolute top-0 end-0 mt-2 me-2 fs-5"
                          onClick={() => handleDeleteCert(cert.id)}
                          style={{ textDecoration: 'none' }}
                          title="Delete certification"
                        >
                          🗑️
                        </Button>
                      </Card>
                    </Col>
                  ))}
                </div>
              ) : (
                <p className="text-muted small">No certifications logged.</p>
              )}

              {/* Add Cert Modal */}
              <Modal show={showCertModal} onHide={() => setShowCertModal(false)} centered>
                <Modal.Header closeButton>
                  <Modal.Title className="fw-bold">Add Certification</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddCert}>
                  <Modal.Body>
                    <Form.Group className="mb-3" controlId="certName">
                      <Form.Label className="uppercase-label">Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={certForm.name}
                        onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                        placeholder="e.g. AWS Developer"
                        required
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="certIssuer">
                      <Form.Label className="uppercase-label">Issued By</Form.Label>
                      <Form.Control
                        type="text"
                        value={certForm.issuingAuthority}
                        onChange={(e) => setCertForm({ ...certForm, issuingAuthority: e.target.value })}
                        placeholder="e.g. Amazon Web Services"
                        required
                      />
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="certIssueDate">
                          <Form.Label className="uppercase-label">Issue Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={certForm.issueDate}
                            onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="certExpiryDate">
                          <Form.Label className="uppercase-label">Expiry Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={certForm.expiryDate}
                            onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3" controlId="certNo">
                      <Form.Label className="uppercase-label">Credential Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={certForm.certificateNumber}
                        onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })}
                        placeholder="e.g. CERT-12345"
                      />
                    </Form.Group>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCertModal(false)}>Cancel</Button>
                    <Button type="submit" className="btn-gf-primary" disabled={actionLoading}>Save</Button>
                  </Modal.Footer>
                </Form>
              </Modal>
            </Card>
          )}

          {/* TAB 4: ENGAGEMENT HISTORY */}
          {activeTab === 'engagements' && (
            <Card className="gf-card border-0">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-slate-800 mb-0">Engagement History Placements</h5>
                <Button className="btn-gf-primary" onClick={() => setShowEngModal(true)}>
                  + Log Engagement
                </Button>
              </div>

              {engagements.length > 0 ? (
                <Table responsive hover className="align-middle border-top text-sm mb-0">
                  <thead>
                    <tr className="text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
                      <th>Client</th>
                      <th>Role</th>
                      <th>Timeline</th>
                      <th>Rating</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagements.map((eng) => (
                      <tr key={eng.id}>
                        <td className="fw-semibold text-slate-800">{eng.clientName}</td>
                        <td>{eng.roleTitle}</td>
                        <td>{eng.startDate} to {eng.endDate || 'Ongoing'}</td>
                        <td>{eng.rating ? renderStars(eng.rating) : 'Not Rated'}</td>
                        <td>
                          <span className={`gf-badge badge-${(eng.status || 'PENDING').toLowerCase()}`}>
                            {eng.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted small">No engagement history logged.</p>
              )}

              {/* Add Engagement Modal */}
              <Modal show={showEngModal} onHide={() => setShowEngModal(false)} centered size="lg">
                <Modal.Header closeButton>
                  <Modal.Title className="fw-bold">Log Engagement History</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddEngagement}>
                  <Modal.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="engClient">
                          <Form.Label className="uppercase-label">Company / Client</Form.Label>
                          <Form.Control
                            type="text"
                            value={engForm.clientName}
                            onChange={(e) => setEngForm({ ...engForm, clientName: e.target.value })}
                            placeholder="e.g. Acme Corp"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="engRole">
                          <Form.Label className="uppercase-label">Role Title</Form.Label>
                          <Form.Control
                            type="text"
                            value={engForm.roleTitle}
                            onChange={(e) => setEngForm({ ...engForm, roleTitle: e.target.value })}
                            placeholder="e.g. Lead Engineer"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="engStart">
                          <Form.Label className="uppercase-label">Start Date</Form.Label>
                          <Form.Control
                            type="date"
                            value={engForm.startDate}
                            onChange={(e) => setEngForm({ ...engForm, startDate: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="engEnd">
                          <Form.Label className="uppercase-label">End Date (Optional)</Form.Label>
                          <Form.Control
                            type="date"
                            value={engForm.endDate}
                            onChange={(e) => setEngForm({ ...engForm, endDate: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="engRating">
                          <Form.Label className="uppercase-label">Rating</Form.Label>
                          <Form.Select
                            value={engForm.rating}
                            onChange={(e) => setEngForm({ ...engForm, rating: e.target.value })}
                          >
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-4" controlId="engFeedback">
                      <Form.Label className="uppercase-label">Feedback Summary</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={engForm.feedback}
                        onChange={(e) => setEngForm({ ...engForm, feedback: e.target.value })}
                        placeholder="Log feedback summary..."
                      />
                    </Form.Group>

                    <h6 className="fw-bold border-bottom pb-2 mb-3 text-slate-800">Verifier Contact Details</h6>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3" controlId="engVName">
                          <Form.Label className="uppercase-label">Verifier Name</Form.Label>
                          <Form.Control
                            type="text"
                            value={engForm.verifyer_name}
                            onChange={(e) => setEngForm({ ...engForm, verifyer_name: e.target.value })}
                            placeholder="Sarah Jenkins"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3" controlId="engVEmail">
                          <Form.Label className="uppercase-label">Verifier Email</Form.Label>
                          <Form.Control
                            type="email"
                            value={engForm.verifyer_email}
                            onChange={(e) => setEngForm({ ...engForm, verifyer_email: e.target.value })}
                            placeholder="sarah@acme.com"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3" controlId="engVPhone">
                          <Form.Label className="uppercase-label">Verifier Phone</Form.Label>
                          <Form.Control
                            type="text"
                            value={engForm.verifyer_phone}
                            onChange={(e) => setEngForm({ ...engForm, verifyer_phone: e.target.value })}
                            placeholder="1234567890"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEngModal(false)}>Cancel</Button>
                    <Button type="submit" className="btn-gf-primary" disabled={actionLoading}>Submit for Verification</Button>
                  </Modal.Footer>
                </Form>
              </Modal>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;

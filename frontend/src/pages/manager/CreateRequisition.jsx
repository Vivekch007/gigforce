import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { createRequisition, publishRequisition } from '../../services/requisitionService';
import { getSkills } from '../../services/contractorService';
import { getErrorMessage } from '../../services/errorUtils';

function CreateRequisition() {
  const navigate = useNavigate();
  
  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modern Toast State
  const [toast, setToast] = useState({ show: false, message: '' });

  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    requiredSkillId: '',
    minExperienceYears: 3,
    maxHourlyRate: 50.00,
    quantity: 1,
    engagementType: 'ONSITE',
    experienceLevel: 'MID',
    startDate: '',
    duration: '6 Months',
  });

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoadingSkills(true);
        
        const [skillsData] = await Promise.all([
          getSkills()
        ]);

        setSkills(skillsData || []);

        const initialForm = {};
        if (skillsData && skillsData.length > 0) {
          initialForm.requiredSkillId = skillsData[0].id;
        }
        
        setForm(prev => ({ ...prev, ...initialForm }));
      } catch (err) {
        setError('Failed to load requisitions metadata catalog.');
      } finally {
        setLoadingSkills(false);
      }
    };
    loadMetadata();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'minExperienceYears' || name === 'quantity'
        ? parseInt(value) || 0
        : name === 'maxHourlyRate'
        ? parseFloat(value) || 0.0
        : value
    }));
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Job Title is required.';
    if (form.title.trim().length < 3) return 'Job Title must be at least 3 characters.';
    if (!form.requiredSkillId) return 'Please select a required skill.';
    if (form.minExperienceYears < 0) return 'Experience cannot be negative.';
    if (form.maxHourlyRate <= 0) return 'Budget rate must be greater than 0.';
    if (form.quantity < 1) return 'Positions required must be at least 1.';
    if (!form.startDate) return 'Start Date is required.';

    // Task 6: Experience level / min experience cross-validation
    const minYrs = parseInt(form.minExperienceYears, 10) || 0;
    if (form.experienceLevel === 'JUNIOR' && minYrs > 3) {
      return 'For Junior level, Minimum Experience must be 3 years or less.';
    }
    if (form.experienceLevel === 'MID' && (minYrs < 2 || minYrs > 6)) {
      return 'For Mid-Level, Minimum Experience must be between 2 and 6 years.';
    }
    if (form.experienceLevel === 'SENIOR' && minYrs < 5) {
      return 'For Senior level, Minimum Experience must be at least 5 years.';
    }

    return '';
  };

  const handleAction = async (publishImmediate) => {
    setError('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      
      // Prepare payload - strip any extra fields
      const payload = {
        title: form.title,
        description: form.description,
        requiredSkillId: form.requiredSkillId,
        minExperienceYears: form.minExperienceYears,
        maxHourlyRate: form.maxHourlyRate,
        quantity: form.quantity,
        engagementType: form.engagementType,
        experienceLevel: form.experienceLevel,
        startDate: form.startDate,
        duration: form.duration,
      };

      const newReq = await createRequisition(payload);
      
      if (publishImmediate) {
        await publishRequisition(newReq.id);
      }

      // Trigger Toast Success Notification
      setToast({ show: true, message: 'Job Requisition submitted successfully.' });

      // Dismiss toast & navigate after 3 seconds
      setTimeout(() => {
        setToast({ show: false, message: '' });
        navigate('/manager/requisitions');
      }, 3000);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDepartmentName = (dept) => {
    if (!dept) return '';
    return dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
  };

  return (
    <div className="container-fluid position-relative">
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Modern Enterprise Success Toast */}
      {toast.show && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            minWidth: '340px',
            backgroundColor: 'rgba(22, 163, 74, 0.06)',
            border: '1px solid rgba(22, 163, 74, 0.16)',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.25rem' }}></i>
            <span className="text-dark small fw-semibold">{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast({ show: false, message: '' })}
            className="btn-enterprise-ghost p-1 border-0 bg-transparent text-muted"
            style={{ fontSize: '1.2rem', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Create Job Requisition</h2>
        <p className="text-muted small mt-1 mb-0">Publish talent demands to vendor networks or save for internal planning.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      <Card className="gf-card p-4 border-0">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3">
            {/* Job Title */}
            <Col md={12}>
              <Form.Group controlId="title">
                <Form.Label className="uppercase-label">Job Title <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Senior Java Engineer"
                  disabled={submitting}
                  required
                />
              </Form.Group>
            </Col>


            {/* Required Skill */}
            <Col md={4}>
              <Form.Group controlId="requiredSkillId">
                <Form.Label className="uppercase-label">Core Skill <span className="text-danger">*</span></Form.Label>
                {loadingSkills ? (
                  <div className="py-2"><Spinner animation="border" size="sm" /></div>
                ) : (
                  <Form.Select
                    name="requiredSkillId"
                    value={form.requiredSkillId}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    {skills.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>
            </Col>

            {/* Employment / Engagement Type */}
            <Col md={4}>
              <Form.Group controlId="engagementType">
                <Form.Label className="uppercase-label">Employment Type <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="engagementType"
                  value={form.engagementType}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="ONSITE">On-Site</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Experience Level */}
            <Col md={4}>
              <Form.Group controlId="experienceLevel">
                <Form.Label className="uppercase-label">Experience Level <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="experienceLevel"
                  value={form.experienceLevel}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="JUNIOR">Junior (1-3 yrs)</option>
                  <option value="MID">Mid-Level (3-5 yrs)</option>
                  <option value="SENIOR">Senior (5+ yrs)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Min Experience Years */}
            <Col md={3}>
              <Form.Group controlId="minExperienceYears">
                <Form.Label className="uppercase-label">Min Exp (Years) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  name="minExperienceYears"
                  value={form.minExperienceYears}
                  onChange={handleChange}
                  min={0}
                  disabled={submitting}
                  required
                />
              </Form.Group>
            </Col>

            {/* Quantity */}
            <Col md={3}>
              <Form.Group controlId="quantity">
                <Form.Label className="uppercase-label">Positions Required <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  min={1}
                  disabled={submitting}
                  required
                />
              </Form.Group>
            </Col>

            {/* Budget / Hourly Rate */}
            <Col md={3}>
              <Form.Group controlId="maxHourlyRate">
                <Form.Label className="uppercase-label">Max Rate ($ / Hr) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="maxHourlyRate"
                  value={form.maxHourlyRate}
                  onChange={handleChange}
                  min={0.01}
                  disabled={submitting}
                  required
                />
              </Form.Group>
            </Col>

            {/* Start Date */}
            <Col md={3}>
              <Form.Group controlId="startDate">
                <Form.Label className="uppercase-label">Start Date <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />
              </Form.Group>
            </Col>

            {/* Duration */}
            <Col md={4}>
              <Form.Group controlId="duration">
                <Form.Label className="uppercase-label">Duration <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="12 Months">12 Months</option>
                  <option value="Indefinite">Indefinite</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Description */}
            <Col md={12}>
              <Form.Group controlId="description">
                <Form.Label className="uppercase-label">Job Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Provide scope of work, technical stack, or deliverables..."
                  maxLength={1000}
                  disabled={submitting}
                />
                <Form.Text className="text-muted">Max 1000 characters.</Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {/* Form Actions */}
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/manager/requisitions')}
              disabled={submitting}
              className="py-2 px-4"
            >
              Cancel
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => handleAction(false)}
              disabled={submitting}
              className="py-2 px-4"
            >
              {submitting ? <Spinner animation="border" size="sm" /> : 'Save Draft'}
            </Button>
            <Button
              className="btn-enterprise-primary py-2 px-4"
              onClick={() => handleAction(true)}
              disabled={submitting}
            >
              {submitting ? <Spinner animation="border" size="sm" /> : 'Submit Requisition'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default CreateRequisition;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Row, Col, Spinner } from 'react-bootstrap';
import { createRequisition, publishRequisition } from '../../services/requisitionService';
import { getSkills } from '../../services/contractorService';
import { getErrorMessage } from '../../services/errorUtils';

function CreateRequisition() {
  const navigate = useNavigate();

  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Enterprise Toast State: type can be 'success' | 'danger'
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form State - Defaulted numeric fields to empty strings ('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    requiredSkillId: '',
    minExperienceYears: '',
    maxHourlyRate: '',
    quantity: '',
    engagementType: 'ONSITE',
    experienceLevel: 'MID',
    startDate: '',
    duration: '6 Months',
  });

  // Helper to trigger floating right-to-left Toast
  const showToast = (message, type = 'danger') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'danger' });
    }, 3500);
  };

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
        showToast('Failed to load requisitions metadata catalog.', 'danger');
      } finally {
        setLoadingSkills(false);
      }
    };
    loadMetadata();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Maintain empty state if user clears the input
    if (value === '') {
      setForm(prev => ({ ...prev, [name]: '' }));
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: name === 'minExperienceYears' || name === 'quantity'
        ? parseInt(value, 10)
        : name === 'maxHourlyRate'
        ? parseFloat(value)
        : value
    }));
  };

  const validateForm = () => {
    if (!form.title.trim()) return 'Job Title is required.';
    if (form.title.trim().length < 3) return 'Job Title must be at least 3 characters.';
    if (!form.requiredSkillId) return 'Please select a required skill.';
    if (form.minExperienceYears === '' || form.minExperienceYears === null) return 'Min Experience is required.';
    if (form.minExperienceYears < 0) return 'Experience cannot be negative.';
    if (form.maxHourlyRate === '' || form.maxHourlyRate <= 0) return 'Budget rate must be greater than 0.';
    if (form.quantity === '' || form.quantity < 1) return 'Positions required must be at least 1.';
    if (!form.startDate) return 'Start Date is required.';

    // Experience level / min experience cross-validation
    const minYrs = parseInt(form.minExperienceYears, 10);

    if (isNaN(minYrs) || minYrs < 0) {
      return 'The experience years is not matching with the experience level what we have selected.';
    }

    if (form.experienceLevel === 'JUNIOR' && (minYrs < 0 || minYrs > 2)) {
      return 'The experience years is not matching with the experience level what we have selected.';
    }

    if (form.experienceLevel === 'MID' && (minYrs < 3 || minYrs > 5)) {
      return 'The experience years is not matching with the experience level what we have selected.';
    }

    if (form.experienceLevel === 'SENIOR' && minYrs <= 5) {
      return 'The experience years is not matching with the experience level what we have selected.';
    }

    return '';
  };

  const handleAction = async (publishImmediate) => {
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'danger');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare payload
      const payload = {
        title: form.title,
        description: form.description,
        requiredSkillId: form.requiredSkillId,
        minExperienceYears: Number(form.minExperienceYears),
        maxHourlyRate: Number(form.maxHourlyRate),
        quantity: Number(form.quantity),
        engagementType: form.engagementType,
        experienceLevel: form.experienceLevel,
        startDate: form.startDate,
        duration: form.duration,
      };

      const newReq = await createRequisition(payload);

      if (publishImmediate) {
        await publishRequisition(newReq.id);
      }

      showToast('Job Requisition submitted successfully.', 'success');

      // Navigate after toast finishes displaying
      setTimeout(() => {
        navigate('/manager/requisitions');
      }, 3500);

    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid position-relative">
      {/* Styles for animation, spinner removal, and toast styles */}
      <style>{`
        @keyframes slideRightToLeft {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Hide number input spinners */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Modern Enterprise Toast Notification (Right to Left Slide) */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            minWidth: '340px',
            maxWidth: '450px',
            backgroundColor: toast.type === 'danger' ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${toast.type === 'danger' ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'slideRightToLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i
              className={`bi ${toast.type === 'danger' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-check-circle-fill text-success'}`}
              style={{ fontSize: '1.25rem' }}
            ></i>
            <span className={`small fw-semibold ${toast.type === 'danger' ? 'text-danger' : 'text-dark'}`}>
              {toast.message}
            </span>
          </div>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="btn p-0 border-0 bg-transparent text-muted"
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
                  <option value="JUNIOR">Junior (0-2 yrs)</option>
                  <option value="MID">Mid-Level (3-5 yrs)</option>
                  <option value="SENIOR">Senior (6+ yrs)</option>
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
                  placeholder="e.g. 3"
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
                  placeholder="e.g. 1"
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
                  placeholder="e.g. 50.00"
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
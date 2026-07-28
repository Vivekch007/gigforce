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
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    businessUnitId: 'bu1', // Default business unit
  });

  useEffect(() => {
    const loadSkills = async () => {
      try {
        setLoadingSkills(true);
        const data = await getSkills();
        setSkills(data || []);
        if (data && data.length > 0) {
          setForm(prev => ({ ...prev, requiredSkillId: data[0].id }));
        }
      } catch (err) {
        setError('Failed to load skills catalog.');
      } finally {
        setLoadingSkills(false);
      }
    };
    loadSkills();
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
    return '';
  };

  const handleAction = async (publishImmediate) => {
    setError('');
    setSuccess('');
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const newReq = await createRequisition(form);
      
      if (publishImmediate) {
        await publishRequisition(newReq.id);
        setSuccess(`Requisition ${newReq.id} created and published successfully!`);
      } else {
        setSuccess(`Requisition ${newReq.id} saved as draft.`);
      }

      setTimeout(() => {
        navigate('/manager/requisitions');
      }, 1500);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Create Job Requisition</h2>
        <p className="text-muted small mt-1 mb-0">Publish talent demands to vendor networks or save for internal planning.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <Card className="gf-card p-4 border-0">
        <Form onSubmit={(e) => e.preventDefault()}>
          <Row className="g-3">
            {/* Job Title */}
            <Col md={6}>
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

            {/* Business Unit / Client */}
            <Col md={6}>
              <Form.Group controlId="businessUnitId">
                <Form.Label className="uppercase-label">Business Unit / Department <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  name="businessUnitId"
                  value={form.businessUnitId}
                  onChange={handleChange}
                  disabled={submitting}
                >
                  <option value="bu1">Engineering</option>
                  <option value="bu2">Product Operations</option>
                  <option value="bu3">Corporate Finance</option>
                  <option value="bu4">Infrastructure & Cloud</option>
                </Form.Select>
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
              className="btn-gf-primary py-2 px-4"
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

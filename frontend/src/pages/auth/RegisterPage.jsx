import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Col, Form, Row, Spinner, InputGroup } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { register as registerUser } from '../../services/authService';
import { getErrorMessage, getFieldErrors } from '../../services/errorUtils';

// Mirrors com.gigforce.identity.enums.UserRole, minus ADMIN - the backend
// (AuthServiceImpl.register) rejects ADMIN self-registration outright, and
// admin accounts are provisioned separately, so it's not offered here.
const ROLE_OPTIONS = [
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'VENDOR_MANAGER', label: 'Vendor Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

// Roles for which an Org Unit ID is required at registration.
const ORG_UNIT_REQUIRED_ROLES = ['HIRING_MANAGER', 'FINANCE', 'VENDOR', 'VENDOR_MANAGER'];

// Exact patterns enforced server-side by RegisterRequestDTO's @Pattern annotations.
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
const PHONE_PATTERN = /^\d{10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  orgUnitId: '',
  role: 'CONTRACTOR',
  password: '',
  confirmPassword: '',
};

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isOrgUnitRequired = ORG_UNIT_REQUIRED_ROLES.includes(form.role);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};
    const trimmedName = form.name.trim();

    if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.name = 'Name must be between 3 and 100 characters';
    }
    if (!EMAIL_PATTERN.test(form.email)) {
      errors.email = 'Email format must be valid';
    }
    if (!PHONE_PATTERN.test(form.phone)) {
      errors.phone = 'Phone must be exactly 10 digits';
    }
    if (!PASSWORD_PATTERN.test(form.password)) {
      errors.password =
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character (@$!%*?&#)';
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (isOrgUnitRequired && !form.orgUnitId.trim()) {
      errors.orgUnitId = `Org Unit ID is required for ${form.role.replace('_', ' ')} accounts`;
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        orgUnitId: form.orgUnitId.trim() || null,
      });

      setSuccessMessage('Account created successfully. Redirecting to sign in…');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setFormError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join GigForce to manage requisitions, assignments, timesheets, and payments."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {formError && (
        <Alert variant="danger" className="py-2">
          {formError}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="py-2">
          {successMessage}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3" controlId="registerName">
          <Form.Label className="uppercase-label">
            Full Name <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            name="name"
            value={form.name}
            onChange={handleChange}
            isInvalid={!!fieldErrors.name}
            placeholder="Enter full name"
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3" controlId="registerEmail">
          <Form.Label className="uppercase-label">
            Email Address <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            isInvalid={!!fieldErrors.email}
            placeholder="Enter email address"
            autoComplete="email"
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
        </Form.Group>

        <Row>
          <Col xs={12} md={6}>
            <Form.Group className="mb-3" controlId="registerPhone">
              <Form.Label className="uppercase-label">
                Phone <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                name="phone"
                value={form.phone}
                onChange={handleChange}
                isInvalid={!!fieldErrors.phone}
                placeholder="Enter phone number"
                maxLength={10}
                inputMode="numeric"
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.phone}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group className="mb-3" controlId="registerOrgUnitId">
              <Form.Label className="uppercase-label">
                Org Unit ID {isOrgUnitRequired && <span className="text-danger">*</span>}
              </Form.Label>
              <Form.Control
                name="orgUnitId"
                value={form.orgUnitId}
                onChange={handleChange}
                isInvalid={!!fieldErrors.orgUnitId}
                placeholder="Enter org unit ID"
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.orgUnitId}</Form.Control.Feedback>
              {!isOrgUnitRequired && !fieldErrors.orgUnitId && (
                <Form.Text className="text-muted">Optional for this role.</Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3" controlId="registerRole">
          <Form.Label className="uppercase-label">
            Role <span className="text-danger">*</span>
          </Form.Label>
          <Form.Select name="role" value={form.role} onChange={handleChange}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Row>
          <Col xs={12} md={6}>
            <Form.Group className="mb-3" controlId="registerPassword">
              <Form.Label className="uppercase-label">
                Password <span className="text-danger">*</span>
              </Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.password}
                  placeholder="Enter password"
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ borderLeft: 'none' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </Button>
                <Form.Control.Feedback type="invalid">{fieldErrors.password}</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group className="mb-3" controlId="registerConfirmPassword">
              <Form.Label className="uppercase-label">
                Confirm Password <span className="text-danger">*</span>
              </Form.Label>
              <InputGroup hasValidation>
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.confirmPassword}
                  placeholder="Enter password again"
                  autoComplete="new-password"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ borderLeft: 'none' }}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Button>
                <Form.Control.Feedback type="invalid">{fieldErrors.confirmPassword}</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </Col>
        </Row>
        {!fieldErrors.password && !fieldErrors.confirmPassword && (
          <Form.Text className="text-muted d-block mb-3" style={{ marginTop: '-0.75rem' }}>
            Min 8 characters with uppercase, lowercase, a digit, and a special character (@$!%*?&amp;#).
          </Form.Text>
        )}

        <Button type="submit" className="btn-gf-primary w-100 py-2" disabled={submitting}>
          {submitting ? <Spinner animation="border" size="sm" /> : 'Create Account'}
        </Button>
      </Form>
    </AuthLayout>
  );
}

export default RegisterPage;

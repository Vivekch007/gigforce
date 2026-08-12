import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { register as registerUser } from '../../services/authService';
import { getErrorMessage, getFieldErrors } from '../../services/errorUtils';

const ROLE_OPTIONS = [
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'VENDOR_MANAGER', label: 'Vendor Manager' },
  { value: 'FINANCE', label: 'Finance' },
];

const ORG_UNIT_REQUIRED_ROLES = ['HIRING_MANAGER', 'FINANCE', 'VENDOR', 'VENDOR_MANAGER'];

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
const PHONE_PATTERN = /^\d{10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Input Character Limits
const FIELD_MAX_LENGTH = 50; // Requested 50 character limit for inputs
const PHONE_MAX_LENGTH = 10; // Phone constrained to 10 digits

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

    // Enforce maximum length limits
    const limit = name === 'phone' ? PHONE_MAX_LENGTH : FIELD_MAX_LENGTH;
    if (value.length > limit) return;

    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};
    const trimmedName = form.name.trim();

    if (trimmedName.length < 3 || trimmedName.length > FIELD_MAX_LENGTH) {
      errors.name = `Name must be between 3 and ${FIELD_MAX_LENGTH} characters`;
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
        <Alert variant="danger" className="enterprise-alert enterprise-alert-danger py-2">
          {formError}
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="enterprise-alert enterprise-alert-success py-2">
          {successMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="row g-3">
        {/* Full Name */}
        <div className="col-12 col-md-6">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerName">
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              id="registerName"
              name="name"
              className={`enterprise-form-control form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              maxLength={FIELD_MAX_LENGTH}
              required
            />
            {fieldErrors.name && <div className="invalid-feedback text-danger mt-1 small">{fieldErrors.name}</div>}
          </div>
        </div>

        {/* Email Address */}
        <div className="col-12 col-md-6">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerEmail">
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="registerEmail"
              type="email"
              name="email"
              className={`enterprise-form-control form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
              autoComplete="email"
              maxLength={FIELD_MAX_LENGTH}
              required
            />
            {fieldErrors.email && <div className="invalid-feedback text-danger mt-1 small">{fieldErrors.email}</div>}
          </div>
        </div>

        {/* Phone */}
        <div className="col-12 col-md-6">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerPhone">
              Phone <span className="text-danger">*</span>
            </label>
            <input
              id="registerPhone"
              name="phone"
              className={`enterprise-form-control form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
              value={form.phone}
              onChange={handleChange}
              placeholder="10 digit number"
              maxLength={PHONE_MAX_LENGTH}
              inputMode="numeric"
              required
            />
            {fieldErrors.phone && <div className="invalid-feedback text-danger mt-1 small">{fieldErrors.phone}</div>}
          </div>
        </div>

        {/* Org Unit ID */}
        <div className="col-12 col-md-6">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerOrgUnitId">
              Org Unit ID {isOrgUnitRequired && <span className="text-danger">*</span>}
            </label>
            <input
              id="registerOrgUnitId"
              name="orgUnitId"
              className={`enterprise-form-control form-control ${fieldErrors.orgUnitId ? 'is-invalid' : ''}`}
              value={form.orgUnitId}
              onChange={handleChange}
              placeholder="e.g. ORG1"
              maxLength={FIELD_MAX_LENGTH}
            />
            {fieldErrors.orgUnitId && <div className="invalid-feedback text-danger mt-1 small">{fieldErrors.orgUnitId}</div>}
            {!isOrgUnitRequired && !fieldErrors.orgUnitId && (
              <span className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>Optional for this role.</span>
            )}
          </div>
        </div>

        {/* Role Select Dropdown */}
        <div className="col-12">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerRole">
              Role <span className="text-danger">*</span>
            </label>
            <select id="registerRole" name="role" className="enterprise-form-select form-select" value={form.role} onChange={handleChange}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Password */}
        <div className="col-12 col-md-6">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerPassword">
              Password <span className="text-danger">*</span>
            </label>
            <div className="position-relative">
              <input
                id="registerPassword"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`enterprise-form-control form-control pe-5 ${fieldErrors.password ? 'is-invalid' : ''}`}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                maxLength={FIELD_MAX_LENGTH}
                required
              />
              <button
                type="button"
                className="position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent pe-3 text-muted"
                onClick={() => setShowPassword(!showPassword)}
                style={{ outline: 'none' }}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            {fieldErrors.password && <div className="invalid-feedback text-danger mt-1 small d-block">{fieldErrors.password}</div>}
          </div>
        </div>

        {/* Confirm Password */}
        <div className="col-12 col-md-6">
          <div className="enterprise-form-group m-0">
            <label className="enterprise-form-label" htmlFor="registerConfirmPassword">
              Confirm Password <span className="text-danger">*</span>
            </label>
            <div className="position-relative">
              <input
                id="registerConfirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                className={`enterprise-form-control form-control pe-5 ${fieldErrors.confirmPassword ? 'is-invalid' : ''}`}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                maxLength={FIELD_MAX_LENGTH}
                required
              />
              <button
                type="button"
                className="position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent pe-3 text-muted"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ outline: 'none' }}
              >
                <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            {fieldErrors.confirmPassword && <div className="invalid-feedback text-danger mt-1 small d-block">{fieldErrors.confirmPassword}</div>}
          </div>
        </div>

        <div className="col-12">
          {!fieldErrors.password && !fieldErrors.confirmPassword && (
            <span className="text-muted d-block mb-3" style={{ fontSize: '11px', marginTop: '-4px' }}>
              At least 8 chars with an uppercase, lowercase, digit, and special char (@$!%*?&#). Max 50 chars.
            </span>
          )}

          {/* Submit Button */}
          <button type="submit" className="btn-enterprise-primary w-100 py-2 justify-content-center" disabled={submitting}>
            {submitting ? <Spinner animation="border" size="sm" /> : 'Create Account'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default RegisterPage;
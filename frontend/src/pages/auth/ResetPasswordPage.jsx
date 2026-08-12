import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { resetPassword } from '../../services/authService';
import { getErrorMessage, getFieldErrors } from '../../services/errorUtils';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: '', newPassword: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!form.token.trim()) {
      errors.token = 'Reset token is required';
    }
    if (!PASSWORD_PATTERN.test(form.newPassword)) {
      errors.newPassword =
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character (@$!%*?&#)';
    }
    if (form.confirmPassword !== form.newPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      await resetPassword({ token: form.token.trim(), newPassword: form.newPassword });
      setSuccessMessage('Password reset successfully. Redirecting to sign in…');
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
      title="Reset your password"
      subtitle="Enter the reset code sent to your email to define a new password."
      footer={
        <>
          <Link to="/forgot-password">Need a new code?</Link>{' '}
          &middot; <Link to="/login">Back to Sign In</Link>
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

      <form onSubmit={handleSubmit} noValidate>
        <div className="enterprise-form-group">
          <label className="enterprise-form-label" htmlFor="resetToken">
            Reset Code <span className="text-danger">*</span>
          </label>
          <input
            id="resetToken"
            name="token"
            className={`enterprise-form-control form-control ${fieldErrors.token ? 'is-invalid' : ''}`}
            value={form.token}
            onChange={handleChange}
            placeholder="ENTER RESET CODE"
            maxLength={7}
            style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
            required
          />
          {fieldErrors.token && <div className="invalid-feedback text-danger mt-1 small">{fieldErrors.token}</div>}
        </div>

        <div className="enterprise-form-group">
          <label className="enterprise-form-label" htmlFor="resetNewPassword">
            New Password <span className="text-danger">*</span>
          </label>
          <div className="position-relative">
            <input
              id="resetNewPassword"
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              className={`enterprise-form-control form-control pe-5 ${fieldErrors.newPassword ? 'is-invalid' : ''}`}
              value={form.newPassword}
              onChange={handleChange}
              placeholder="New password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent pe-3 text-muted"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{ outline: 'none' }}
            >
              <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
          {fieldErrors.newPassword && <div className="invalid-feedback text-danger mt-1 small d-block">{fieldErrors.newPassword}</div>}
          {!fieldErrors.newPassword && (
            <span className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>
              At least 8 chars with an uppercase, lowercase, digit, and special char (@$!%*?&#).
            </span>
          )}
        </div>

        <div className="enterprise-form-group">
          <label className="enterprise-form-label" htmlFor="resetConfirmPassword">
            Confirm New Password <span className="text-danger">*</span>
          </label>
          <div className="position-relative">
            <input
              id="resetConfirmPassword"
              type={showConfirmNewPassword ? 'text' : 'password'}
              name="confirmPassword"
              className={`enterprise-form-control form-control pe-5 ${fieldErrors.confirmPassword ? 'is-invalid' : ''}`}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent pe-3 text-muted"
              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
              style={{ outline: 'none' }}
            >
              <i className={`bi ${showConfirmNewPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
          {fieldErrors.confirmPassword && <div className="invalid-feedback text-danger mt-1 small d-block">{fieldErrors.confirmPassword}</div>}
        </div>

        <button type="submit" className="btn-enterprise-primary w-100 py-2 justify-content-center mt-2" disabled={submitting}>
          {submitting ? <Spinner animation="border" size="sm" /> : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;

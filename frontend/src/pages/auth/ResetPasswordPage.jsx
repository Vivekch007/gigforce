import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner, InputGroup } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { resetPassword } from '../../services/authService';
import { getErrorMessage, getFieldErrors } from '../../services/errorUtils';

// Same @Pattern rule enforced server-side on ResetPasswordRequestDTO.newPassword.
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
      footer={
        <>
          <Link to="/forgot-password">Need a new code?</Link>{' '}
          &middot; <Link to="/login">Back to Sign In</Link>
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
        <Form.Group className="mb-3" controlId="resetToken">
          <Form.Label className="uppercase-label">
            Reset Code <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            name="token"
            value={form.token}
            onChange={handleChange}
            isInvalid={!!fieldErrors.token}
            placeholder="Enter reset code"
            maxLength={7}
            style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}
          />
          <Form.Control.Feedback type="invalid">{fieldErrors.token}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3" controlId="resetNewPassword">
          <Form.Label className="uppercase-label">
            New Password <span className="text-danger">*</span>
          </Form.Label>
          <InputGroup hasValidation>
            <Form.Control
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              isInvalid={!!fieldErrors.newPassword}
              placeholder="Enter password"
              autoComplete="new-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{ borderLeft: 'none' }}
            >
              {showNewPassword ? '🙈' : '👁️'}
            </Button>
            <Form.Control.Feedback type="invalid">{fieldErrors.newPassword}</Form.Control.Feedback>
          </InputGroup>
          {!fieldErrors.newPassword && (
            <Form.Text className="text-muted">
              Min 8 characters with uppercase, lowercase, a digit, and a special character
              (@$!%*?&amp;#).
            </Form.Text>
          )}
        </Form.Group>

        <Form.Group className="mb-3" controlId="resetConfirmPassword">
          <Form.Label className="uppercase-label">
            Confirm New Password <span className="text-danger">*</span>
          </Form.Label>
          <InputGroup hasValidation>
            <Form.Control
              type={showConfirmNewPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              isInvalid={!!fieldErrors.confirmPassword}
              placeholder="Enter password again"
              autoComplete="new-password"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
              style={{ borderLeft: 'none' }}
            >
              {showConfirmNewPassword ? '🙈' : '👁️'}
            </Button>
            <Form.Control.Feedback type="invalid">
              {fieldErrors.confirmPassword}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Button type="submit" className="btn-gf-primary w-100 py-2" disabled={submitting}>
          {submitting ? <Spinner animation="border" size="sm" /> : 'Reset Password'}
        </Button>
      </Form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;

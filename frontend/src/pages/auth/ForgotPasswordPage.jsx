import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { forgotPassword } from '../../services/authService';
import { getErrorMessage } from '../../services/errorUtils';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 30;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendInfo, setResendInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    await forgotPassword({ email: email.trim() });
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setEmailError('');

    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await sendCode();
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setResendInfo('');
    try {
      await sendCode();
      setResendInfo('A new code has been sent.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email to receive a password reset code."
      footer={
        <>
          <Link to="/forgot-password">Need a new code?</Link>{' '}
          &middot; <Link to="/login">Back to Sign In</Link>
        </>
      }
    >
      {error && (
        <Alert variant="danger" className="enterprise-alert enterprise-alert-danger py-2">
          {error}
        </Alert>
      )}

      {submitted ? (
        <>
          <Alert variant="success" className="enterprise-alert enterprise-alert-success py-2">
            If an account exists for <strong>{email}</strong>, a password reset code has been sent.
          </Alert>
          {resendInfo && (
            <Alert variant="info" className="enterprise-alert enterprise-alert-success py-2">
              {resendInfo}
            </Alert>
          )}
          <button
            className="btn-enterprise-secondary w-100 mb-3 justify-content-center"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </button>
          <button
            className="btn-enterprise-primary w-100 justify-content-center"
            onClick={() => navigate('/reset-password')}
          >
            I have my reset code
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="enterprise-form-group">
            <label className="enterprise-form-label" htmlFor="forgotEmail">
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="forgotEmail"
              type="email"
              className={`enterprise-form-control form-control ${emailError ? 'is-invalid' : ''}`}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
              }}
              placeholder="name@company.com"
              required
            />
            {emailError && <div className="invalid-feedback text-danger mt-1 small">{emailError}</div>}
          </div>

          <button type="submit" className="btn-enterprise-primary w-100 py-2 justify-content-center" disabled={submitting}>
            {submitting ? <Spinner animation="border" size="sm" /> : 'Send Reset Code'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;

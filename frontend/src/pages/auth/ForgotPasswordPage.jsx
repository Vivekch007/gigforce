import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
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
      // The backend always returns 200 here regardless of whether the email
      // is registered, so we show the same neutral confirmation either way -
      // this is intentional (it stops an attacker from using this form to
      // find out which emails have accounts).
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
      footer={
        <>
          <Link to="/forgot-password">Need a new code?</Link>{' '}
          &middot; <Link to="/login">Back to Sign In</Link>
        </>
      }
    >
      {error && (
        <Alert variant="danger" className="py-2">
          {error}
        </Alert>
      )}

      {submitted ? (
        <>
          <Alert variant="success" className="py-2">
            If an account exists for <strong>{email}</strong>, a password reset code has been
            sent to that address.
          </Alert>
          {resendInfo && (
            <Alert variant="info" className="py-2">
              {resendInfo}
            </Alert>
          )}
          <Button
            variant="outline-secondary"
            className="w-100 mb-2"
            onClick={handleResend}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </Button>
          <Button
            className="btn-gf-primary w-100"
            onClick={() => navigate('/reset-password')}
          >
            I have my reset code
          </Button>
        </>
      ) : (
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3" controlId="forgotEmail">
            <Form.Label className="uppercase-label">
              Email Address <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
              }}
              isInvalid={!!emailError}
              placeholder="Enter email address"
              required
            />
            <Form.Control.Feedback type="invalid">{emailError}</Form.Control.Feedback>
          </Form.Group>

          <Button type="submit" className="btn-gf-primary w-100 py-2" disabled={submitting}>
            {submitting ? <Spinner animation="border" size="sm" /> : 'Send Reset Code'}
          </Button>
        </Form>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;

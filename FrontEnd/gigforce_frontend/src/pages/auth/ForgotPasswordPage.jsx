import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { forgotPassword } from '../../services/authService';
import { getErrorMessage } from '../../services/errorUtils';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await forgotPassword({ email: email.trim() });
      // The backend always returns 200 here regardless of whether the email
      // exists, so we show the same neutral confirmation either way.
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
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
          <Button
            variant="outline-secondary"
            className="w-100"
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
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
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

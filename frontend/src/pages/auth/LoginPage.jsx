import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner, InputGroup } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardPathForRole } from '../../utils/roleRouting';
import { getErrorMessage } from '../../services/errorUtils';

function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await loginUser(form);
      const redirectTo = location.state?.from?.pathname || getDashboardPathForRole(data.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your GigForce workspace."
      footer={
        <>
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </>
      }
    >
      {error && (
        <Alert variant="danger" className="py-2">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} noValidate>
        <Form.Group className="mb-3" controlId="loginEmail">
          <Form.Label className="uppercase-label">
            Email Address <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter email address"
            autoComplete="username"
            required
          />
        </Form.Group>

        <Form.Group className="mb-2" controlId="loginPassword">
          <Form.Label className="uppercase-label">
            Password <span className="text-danger">*</span>
          </Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
            <Button
              variant="outline-secondary"
              onClick={() => setShowPassword(!showPassword)}
              style={{ borderLeft: 'none' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </Button>
          </InputGroup>
        </Form.Group>

        <div className="d-flex justify-content-end mb-3">
          <Link to="/forgot-password" className="small text-decoration-none">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="btn-gf-primary w-100 py-2" disabled={submitting}>
          {submitting ? <Spinner animation="border" size="sm" /> : 'Sign In'}
        </Button>
      </Form>
    </AuthLayout>
  );
}

export default LoginPage;

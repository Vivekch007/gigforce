import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardPathForRole } from '../../utils/roleRouting';
import { getErrorMessage } from '../../services/errorUtils';

// Define input character limits
const EMAIL_MAX_LENGTH = 50; // Standard maximum length for RFC 5321 email addresses
const PASSWORD_MAX_LENGTH = 50; // Standard maximum limit for security and performance

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

    // Enforce max lengths programmatically
    if (name === 'email' && value.length > EMAIL_MAX_LENGTH) return;
    if (name === 'password' && value.length > PASSWORD_MAX_LENGTH) return;

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
        <Alert variant="danger" className="enterprise-alert enterprise-alert-danger py-2">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="enterprise-form-group">
          <label className="enterprise-form-label" htmlFor="loginEmail">
            Email Address <span className="text-danger">*</span>
          </label>
          <input
            id="loginEmail"
            type="email"
            name="email"
            className="enterprise-form-control"
            value={form.email}
            onChange={handleChange}
            placeholder="name@company.com"
            autoComplete="username"
            maxLength={EMAIL_MAX_LENGTH}
            required
          />
        </div>

        <div className="enterprise-form-group mb-1">
          <label className="enterprise-form-label" htmlFor="loginPassword">
            Password <span className="text-danger">*</span>
          </label>
          <div className="position-relative">
            <input
              id="loginPassword"
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="enterprise-form-control pe-5"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={PASSWORD_MAX_LENGTH}
              required
            />
            <button
              type="button"
              className="position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent pe-3 text-muted"
              onClick={() => setShowPassword(!showPassword)}
              style={{ outline: 'none' }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
        </div>

        <div className="d-flex justify-content-end mb-4">
          <Link to="/forgot-password" style={{ fontSize: '13px', fontWeight: '500' }}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-enterprise-primary w-100 py-2 justify-content-center" disabled={submitting}>
          {submitting ? <Spinner animation="border" size="sm" /> : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
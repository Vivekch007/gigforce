import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Dashboards.css';

// Shared shell for every role's placeholder dashboard (Phase 1). Phase 2 will
// replace the body of each role dashboard with real modules while keeping this shell.
function DashboardPlaceholder({ title, badgeVariant = 'primary', children }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-shell">
      <nav className="navbar dashboard-navbar px-3 px-md-4">
        <span className="navbar-brand fw-bold text-light mb-0">GigForce</span>
        <div className="d-flex align-items-center gap-3">
          <span className={`badge role-tag ${badgeVariant}`}>{user?.role}</span>
          <span className="text-light small d-none d-sm-inline">{user?.email}</span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="container py-5">
        <h1 className="fw-bold mb-2">{title}</h1>
        <p className="text-muted mb-4">
          Welcome, <strong>{user?.email}</strong>. This is a Phase 1 placeholder for the{' '}
          <strong>{user?.role}</strong> role — Phase 2 will populate this workspace with your
          role-specific modules.
        </p>
        {children}
      </div>
    </div>
  );
}

export default DashboardPlaceholder;

import { Link } from 'react-router-dom';
import './Auth.css';


const COVER_IMAGE =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80';

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-split-screen">
      <div
        className="auth-image-frame d-none d-lg-block"
        style={{ backgroundImage: `url(${COVER_IMAGE})` }}
      />


      <div className="auth-form-frame">
        <div className="auth-form-container">
          <Link to="/" className="gf-brand-logo mb-4">
            <i className="bi bi-briefcase-fill text-primary"></i>
            <span>GigForce</span>
          </Link>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth-footer-note">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;

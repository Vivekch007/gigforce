import { Link } from 'react-router-dom';
import './LandingPage.css';

const QUICK_STATS = [
  { value: '100%', label: 'Automated Timesheet Approvals' },
  { value: 'Zero', label: 'PO Over-budget Risks' },
  { value: 'Real-Time', label: 'Audit & Compliance Logging' },
  { value: 'Multi-Module', label: 'Enterprise Sourcing & Invoicing' },
];

const CORE_MODULES = [
  {
    icon: 'bi-clipboard-check',
    accent: 'accent-blue',
    title: 'Resource Requisitions',
    description:
      'Hiring managers raise resource demands with specific skill requirements, max budget rates, and engagement types. Vendors submit qualified worker profiles directly against open requests.',
  },
  {
    icon: 'bi-calendar-week',
    accent: 'accent-orange',
    title: 'Timesheets & Leave Tracking',
    description:
      'Contractors log weekly regular and overtime hours. Integrated approval queues allow managers to review, comment, approve, or reject time logs and leave requests.',
  },
  {
    icon: 'bi-receipt-cutoff',
    accent: 'accent-emerald',
    title: 'Invoicing & Purchase Orders',
    description:
      'Finance teams control budget drawdowns using PO caps. Vendor invoices are submitted against approved timesheets and settled through transparent payment tracking.',
  },
];

const TRUST_ITEMS = [
  {
    icon: 'bi-shield-lock',
    title: 'Stateless JWT & RBAC',
    description:
      'Every request is authenticated with stateless JWT tokens and authorized through strict role-based access control across all modules.',
  },
  {
    icon: 'bi-bell',
    title: 'Automated Warning Schedulers',
    description:
      'Background jobs proactively flag PO exhaustion, certification expiry, and assignments ending soon — before they become a problem.',
  },
  {
    icon: 'bi-journal-check',
    title: '90-Day Automated Audit Logging',
    description:
      'Every mutating operation across the platform is logged automatically, giving compliance teams a full, traceable audit trail.',
  },
];

function LandingPage() {
  return (
    <div>
      <nav className="navbar navbar-expand-lg gf-navbar sticky-top">
        <div className="container">
          <Link className="navbar-brand" to="/">
            GigForce
            <span className="gf-nav-badge">Workforce Platform</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#gfNavCollapse"
            aria-controls="gfNavCollapse"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="gfNavCollapse">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <a className="nav-link" href="#features">
                  Features
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#capabilities">
                  Capabilities
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#compliance">
                  Compliance
                </a>
              </li>
            </ul>
            <div className="d-flex align-items-center gap-3">
              <Link to="/login" className="gf-nav-signin">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-gf-primary btn-sm px-3">
                Get Started &rarr;
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <header id="features" className="hero-section text-center">
        <div className="container">
          <span className="hero-badge">
            <i className="bi bi-stars" /> End-to-End Contract &amp; Gig Management
          </span>
          <h1 className="hero-title">Streamline Your Contingent Workforce Lifecycle</h1>
          <p className="hero-subtitle">
            GigForce empowers enterprises, staffing agencies, and contractors to seamlessly manage
            talent sourcing, weekly timesheets, purchase orders, invoicing, and workforce analytics
            — all in one place.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/register" className="btn btn-gf-primary btn-lg px-4">
              Register Account
            </Link>
            <Link to="/login" className="btn btn-gf-outline-hero btn-lg px-4">
              Access Portal
            </Link>
          </div>

          <div className="row hero-stats g-3">
            {QUICK_STATS.map((stat) => (
              <div className="col-6 col-md-3" key={stat.label}>
                <div className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section id="capabilities" className="gf-section bg-gray-50">
        <div className="container text-center">
          <div className="gf-section-eyebrow">Core Modules</div>
          <h2 className="gf-section-title">What GigForce Provides</h2>
          <p className="gf-section-subtitle mb-5">
            Purpose-built modules that mirror how contract and gig workforce programs actually
            operate, end to end.
          </p>
          <div className="row g-4">
            {CORE_MODULES.map((module) => (
              <div className="col-md-4" key={module.title}>
                <div className="module-card text-start">
                  <div className={`module-icon-badge ${module.accent}`}>
                    <i className={`bi ${module.icon}`} />
                  </div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="compliance" className="trust-section text-center">
        <div className="container">
          <div className="gf-section-eyebrow">Enterprise Trust</div>
          <h2 className="gf-section-title" style={{ color: '#f8fafc' }}>
            Security &amp; Compliance, Built In
          </h2>
          <p className="gf-section-subtitle mb-5" style={{ color: '#94a3b8' }}>
            Every action on the platform is authenticated, authorized, and audited by design.
          </p>
          <div className="row g-4">
            {TRUST_ITEMS.map((item) => (
              <div className="col-md-4" key={item.title}>
                <div className="trust-card text-start">
                  <div className="trust-card-icon">
                    <i className={`bi ${item.icon}`} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="gf-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-6">
              <h5>GigForce</h5>
              <p>
                End-to-end contract &amp; gig workforce management — sourcing, timesheets,
                invoicing, and compliance, in one secure platform.
              </p>
            </div>
            <div className="col-6 col-md-3">
              <h5>Account</h5>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Get Started</Link>
            </div>
            <div className="col-6 col-md-3">
              <h5>Platform</h5>
              <a href="#features">Features</a>
              <a href="#compliance">Compliance</a>
            </div>
          </div>
          <div className="gf-footer-bottom">&copy; 2026 GigForce. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

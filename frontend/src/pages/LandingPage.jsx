import { useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const QUICK_STATS = [
  { value: '100%', label: 'Compliance Rate' },
  { value: '$24M+', label: 'Invoices Settled' },
  { value: '12k+', label: 'Contractors Engaged' },
  { value: '< 2hr', label: 'Onboarding Time' },
];

const FEATURES = [
  {
    icon: 'bi-briefcase',
    title: 'Resource Requisitions',
    description: 'Hiring managers raise resource demands with specific skill requirements, max budget rates, and engagement types.'
  },
  {
    icon: 'bi-people',
    title: 'Vendor Submissions',
    description: 'Vendors submit qualified contractor profiles directly against open requests, allowing seamless review and interview loops.'
  },
  {
    icon: 'bi-calendar-check',
    title: 'Timesheets & Leave Approvals',
    description: 'Contractors log weekly regular and overtime hours. Integrated queues allow managers to review and approve logs instantly.'
  },
  {
    icon: 'bi-receipt',
    title: 'PO & Invoice Controls',
    description: 'Finance teams control budget drawdowns using PO caps. Vendor invoices are submitted directly against approved timesheets.'
  },
  {
    icon: 'bi-shield-lock',
    title: 'RBAC Security & Compliance',
    description: 'Secure stateless JWT token architecture. Role-based access constraints ensure data privacy across all enterprise workflows.'
  },
  {
    icon: 'bi-journal-check',
    title: 'Automated Audit Trails',
    description: 'Every mutating action across the platform is logged automatically, giving compliance and audit teams a full traceable ledger.'
  }
];

const WORKFLOWS = {
  admin: {
    title: 'Enterprise Administrator',
    badge: 'Control Center',
    desc: 'Manage the global enterprise configurations, register verified organizations, orchestrate system settings, and trace real-time audit logs across the entire workforce ecosystem.',
    points: ['Manage organizational units & configurations', 'Access centralized master skill catalog', 'Monitor compliance audit logs', 'Provision system users and role permissions']
  },
  manager: {
    title: 'Hiring Manager',
    badge: 'Talent Acquisition',
    desc: 'Create detailed project requisitions, review qualified candidate submissions from vendors, schedule interview rounds, manage active assignments, and approve weekly contractor time logs.',
    points: ['Raise skill-targeted resource demands', 'Review and screen candidate profiles', 'Approve leaves & weekly hours', 'Initiate timesheet-to-invoice pipelines']
  },
  vendor: {
    title: 'Staffing Vendor',
    badge: 'Supply Chain',
    desc: 'Receive real-time requisition alerts, manage candidate databases, submit verified talent profiles against requisitions, track active assignments, and generate timesheets for billing.',
    points: ['Access direct client requisition streams', 'Track submission pipelines & interviews', 'Monitor contractor placements', 'Reconcile purchase orders and invoices']
  },
  contractor: {
    title: 'Contractor / Gig Worker',
    badge: 'Workforce Portal',
    desc: 'Access personal dashboards to track active assignments, log weekly hours and overtime, submit time-off requests, and track payments/invoices from client organizations.',
    points: ['Access individual assignment details', 'Submit weekly hours and overtime', 'Request leaf / absence approvals', 'Verify payment settlements']
  }
};

function LandingPage() {
  const [activeWorkflow, setActiveWorkflow] = useState('manager');

  return (
    <div style={{ backgroundColor: 'var(--gf-bg)' }}>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg landing-nav">
        <div className="container">
          <Link className="gf-brand-logo" to="/">
            <i className="bi bi-briefcase-fill text-primary"></i>
            <span>GigForce</span>
          </Link>
          <button
            className="navbar-toggler border-0"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#gfNavCollapse"
            aria-controls="gfNavCollapse"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <i className="bi bi-list fs-2"></i>
          </button>
          <div className="collapse navbar-collapse" id="gfNavCollapse">
            <ul className="navbar-nav mx-auto gap-1">
              <li className="nav-item">
                <a className="nav-link" href="#features">Features</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#workflows">Workflows</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#security">Security</a>
              </li>
            </ul>
            <div className="d-flex align-items-center gap-3">
              <Link to="/login" className="btn-enterprise-ghost text-decoration-none py-2 px-3">
                Sign In
              </Link>
              <Link to="/register" className="btn-enterprise-primary text-decoration-none">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="container">
          <div className="hero-badge">
            <i className="bi bi-shield-check"></i>
            <span>End-to-End Enterprise Contingent Management</span>
          </div>
          <h1 className="hero-title mx-auto" style={{ maxWidth: '800px', marginBottom: '20px' }}>
            Streamline Your Enterprise Workforce Lifecycle
          </h1>
          <p className="hero-subtitle">
            A secure, automated ecosystem for hiring managers, vendors, and contractors to orchestrate resource requisitions, weekly timesheets, compliance audit logs, and invoicing.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap mb-5">
            <Link to="/register" className="btn-enterprise-primary text-decoration-none px-4 py-2">
              Create Account
            </Link>
            <Link to="/login" className="btn-enterprise-secondary text-decoration-none px-4 py-2">
              Access Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Client Logos Section */}
      <section className="logos-section">
        <div className="container">
          <div className="row align-items-center justify-content-center gap-5">
            <div className="col-auto logo-item">Acme Corp</div>
            <div className="col-auto logo-item">Global Logistics</div>
            <div className="col-auto logo-item">Stellar Tech</div>
            <div className="col-auto logo-item">Apex Financial</div>
            <div className="col-auto logo-item">Nova Biotech</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="text-center mb-5">
            <span className="text-primary fw-semibold small text-uppercase letter-spacing">Key Capabilities</span>
            <h2 className="section-title mt-2">Enterprise-Grade Performance</h2>
            <p className="muted-text mx-auto" style={{ maxWidth: '580px' }}>
              Built specifically to replace fragmented legacy spreadsheets with a secure unified system.
            </p>
          </div>

          <div className="row g-4">
            {FEATURES.map((feat) => (
              <div className="col-md-4" key={feat.title}>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <i className={`bi ${feat.icon}`}></i>
                  </div>
                  <h3>{feat.title}</h3>
                  <p>{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflows Section */}
      <section id="workflows" className="workflow-section">
        <div className="container">
          <div className="text-center mb-5">
            <span className="text-primary fw-semibold small text-uppercase letter-spacing">Product Workflows</span>
            <h2 className="section-title mt-2">Role-Based Experiences</h2>
            <p className="muted-text mx-auto" style={{ maxWidth: '580px' }}>
              Every persona logs into a custom portal designed for their exact daily operational workflows.
            </p>
          </div>

          <div className="workflow-tab-container">
            <div className="workflow-tabs">
              {Object.keys(WORKFLOWS).map((role) => (
                <button
                  key={role}
                  className={`workflow-tab-btn ${activeWorkflow === role ? 'active' : ''}`}
                  onClick={() => setActiveWorkflow(role)}
                >
                  {WORKFLOWS[role].title}
                </button>
              ))}
            </div>

            <div className="workflow-content-card">
              <div className="row align-items-center g-4">
                <div className="col-lg-7">
                  <span className="badge bg-primary bg-opacity-10 text-primary mb-3 px-3 py-2" style={{ borderRadius: '6px' }}>
                    {WORKFLOWS[activeWorkflow].badge}
                  </span>
                  <h3 className="section-title mb-3">{WORKFLOWS[activeWorkflow].title}</h3>
                  <p className="body-text mb-4 text-muted">{WORKFLOWS[activeWorkflow].desc}</p>
                  
                  <div className="row g-2">
                    {WORKFLOWS[activeWorkflow].points.map((pt, i) => (
                      <div key={i} className="col-sm-6 d-flex align-items-center gap-2 small fw-medium text-dark">
                        <i className="bi bi-check-circle text-success"></i>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-lg-5 text-center d-none d-lg-block">
                  <i className="bi bi-window-sidebar text-muted" style={{ fontSize: '120px', opacity: 0.15 }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Stats Section */}
      <section id="security" className="stats-section">
        <div className="container">
          <div className="text-center mb-5">
            <span className="text-primary fw-semibold small text-uppercase letter-spacing">Metrics & Impact</span>
            <h2 className="section-title mt-2">GigForce by the Numbers</h2>
            <p className="muted-text mx-auto" style={{ maxWidth: '580px' }}>
              Empowering large companies to eliminate PO overruns, compliance risks, and operational bottleneck.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {QUICK_STATS.map((stat) => (
              <div className="col-6 col-md-3" key={stat.label}>
                <div className="p-4 border rounded-4 bg-white shadow-sm" style={{ borderColor: 'var(--gf-border)' }}>
                  <div className="stat-item-val">{stat.value}</div>
                  <div className="stat-item-lbl">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="features-section" style={{ borderTop: '1px solid var(--gf-border)' }}>
        <div className="container">
          <div className="text-center mb-5">
            <span className="text-primary fw-semibold small text-uppercase letter-spacing">Testimonials</span>
            <h2 className="section-title mt-2">Loved by Operations Teams</h2>
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <div className="feature-card">
                <p className="body-text text-muted mb-4 italic">
                  "GigForce cut our external vendor onboarding and timesheet reconciliation time by more than 80%. Having PO guardrails and automatic warning notifications has completely removed invoice overbilling."
                </p>
                <div className="d-flex align-items-center gap-3">
                  <div className="topbar-avatar">HR</div>
                  <div>
                    <h5 className="small fw-semibold m-0 text-dark">Director of HR Operations</h5>
                    <span className="text-muted" style={{ fontSize: '12px' }}>Nova Biotech Group</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="feature-card">
                <p className="body-text text-muted mb-4 italic">
                  "As a vendor, having a direct platform to view client resource requisitions, submit candidates, and track invoices against timesheets has transformed our relations with our main enterprise clients."
                </p>
                <div className="d-flex align-items-center gap-3">
                  <div className="topbar-avatar">VS</div>
                  <div>
                    <h5 className="small fw-semibold m-0 text-dark">Managing Director</h5>
                    <span className="text-muted" style={{ fontSize: '12px' }}>Apex Staffing Solutions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2 className="hero-title mb-3" style={{ fontSize: '40px' }}>Ready to Streamline Your Operations?</h2>
          <p className="cta-subtitle mx-auto" style={{ maxWidth: '600px' }}>
            Get started today by registering your organization, or contact our enterprise team to receive a guided workforce workflow demo.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn-enterprise-primary text-decoration-none px-4 py-2">
              Get Started Now
            </Link>
            <Link to="/login" className="btn-enterprise-secondary text-decoration-none px-4 py-2">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="gf-brand-logo mb-3">
                <i className="bi bi-briefcase-fill text-primary"></i>
                <span>GigForce</span>
              </div>
              <p className="muted-text" style={{ maxWidth: '420px' }}>
                A premium, centralized workforce platform orchestrating contract and gig operations with strict compliance, automated timesheets, and finance safeguards.
              </p>
            </div>
            <div className="col-sm-6 col-lg-3">
              <h5>Product</h5>
              <ul className="list-unstyled d-flex flex-column gap-2">
                <li><a href="#features" className="text-decoration-none">Features</a></li>
                <li><a href="#workflows" className="text-decoration-none">Workflows</a></li>
                <li><a href="#security" className="text-decoration-none">Security</a></li>
              </ul>
            </div>
            <div className="col-sm-6 col-lg-3">
              <h5>Account</h5>
              <ul className="list-unstyled d-flex flex-column gap-2">
                <li><Link to="/login" className="text-decoration-none">Access Portal</Link></li>
                <li><Link to="/register" className="text-decoration-none">Get Started</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} GigForce. All rights reserved.</span>
            <div className="d-flex gap-4">
              <a href="#" className="text-decoration-none">Privacy Policy</a>
              <a href="#" className="text-decoration-none">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

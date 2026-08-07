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
    </div>
  );
}

export default LandingPage;

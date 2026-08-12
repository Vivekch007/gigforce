import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { ToastContainer } from '../components/Toast';

const SEARCH_PLACEHOLDERS = {
  '/vendor/dashboard': 'Search Candidates, Requisitions, Assignments...',
  '/vendor/requisitions': 'Search open requisitions...',
  '/vendor/candidates': 'Search candidate database...',
  '/vendor/submissions': 'Search submissions...',
  '/vendor/interviews': 'Search interviews...',
  '/vendor/assignments': 'Search placements...',
  '/vendor/timesheets': 'Search timesheets...',
  '/vendor/purchase-orders': 'Search POs...',
  '/vendor/notifications': 'Search alerts...',
};

const SIDEBAR_LINKS = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: 'bi bi-speedometer2' },
  { to: '/vendor/requisitions', label: 'Open Requisitions', icon: 'bi bi-folder2-open' },
  { to: '/vendor/candidates', label: 'Candidate Pool', icon: 'bi bi-people' },
  { to: '/vendor/submissions', label: 'My Submissions', icon: 'bi bi-file-earmark-arrow-up' },
  { to: '/vendor/interviews', label: 'Interviews Queue', icon: 'bi bi-calendar-event' },
  { to: '/vendor/assignments', label: 'Active Placements', icon: 'bi bi-briefcase' },
  { to: '/vendor/timesheets', label: 'Timesheet Registry', icon: 'bi bi-clock-history' },
  { to: '/vendor/purchase-orders', label: 'Purchase Orders', icon: 'bi bi-receipt' },
  { to: '/vendor/reports', label: 'Analytics Reports', icon: 'bi bi-bar-chart' },
];

function VendorLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showSidebar, setShowSidebar] = useState(false);
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setSearchVal(searchParams.get('search') || '');
  }, [location.pathname, searchParams]);

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (val.trim()) {
      setSearchParams({ search: val });
    } else {
      setSearchParams({});
    }
  };

  const addToast = (toast) => {
    const id = String(Math.random());
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Expose toast add to nested routes
  useEffect(() => {
    window.addVendorToast = addToast;
    return () => {
      delete window.addVendorToast;
    };
  }, []);

  const currentPath = location.pathname;
  const isSearchSupported = Object.keys(SEARCH_PLACEHOLDERS).some(path => currentPath.startsWith(path));
  const searchPlaceholder = SEARCH_PLACEHOLDERS[currentPath] || 'Search...';

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  useEffect(() => {
    setShowSidebar(false);
  }, [location.pathname]);

  const getInitials = () => {
    if (!user?.email) return 'V';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user?.email) return 'Vendor User';
    const namePart = user.email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const getRoleText = () => {
    if (user?.role === 'VENDOR_MANAGER') return 'Vendor Mgr';
    return 'Vendor';
  };

  return (
    <div className="app-layout-shell">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <header className="enterprise-global-header">
        <div className="container-fluid px-2 w-100 d-flex align-items-center justify-content-between flex-nowrap h-100">
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <button className="btn btn-link text-dark p-1 me-1 d-lg-none" onClick={toggleSidebar} aria-label="Toggle navigation">
              <i className="bi bi-list fs-4"></i>
            </button>
            <NavLink to="/vendor/dashboard" className="navbar-brand d-flex align-items-center gap-1 m-0 fw-bold fs-6 text-decoration-none">
              <i className="bi bi-briefcase-fill text-primary"></i>
              <span className="text-dark">GigForce</span>
            </NavLink>
          </div>
          
          <div className="d-flex align-items-center flex-grow-1 justify-content-end ms-2">
            <Topbar
            searchPlaceholder={searchPlaceholder}
            searchVal={searchVal}
            onSearchChange={handleSearchChange}
            isSearchSupported={isSearchSupported}
            userRoleBadge={`${getRoleText()} Workspace`}
            notificationsPath="/vendor/notifications"
            profilePath="/vendor/profile"
            userName={getDisplayName()}
            userInitials={getInitials()}
          />
          </div>
        </div>
      </header>

      <Sidebar
        brandName="GigForce"
        links={SIDEBAR_LINKS}
        userRole={getRoleText()}
        userName={getDisplayName()}
        userInitials={getInitials()}
        onLogout={handleLogout}
        show={showSidebar}
        onHide={() => setShowSidebar(false)}
      />

      <div className="enterprise-layout-wrapper flex-grow-1">
        <main className="enterprise-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default VendorLayout;

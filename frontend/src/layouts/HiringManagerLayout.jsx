import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const SEARCH_PLACEHOLDERS = {
  '/manager/dashboard': 'Search Requisitions, Contractors, Vendors...',
  '/manager/requisitions': 'Search requisitions...',
  '/manager/vendor-submissions': 'Search submissions...',
  '/manager/interviews': 'Search interview schedules...',
  '/manager/assignments': 'Search Assignments...',
  '/manager/timesheet-approvals': 'Search timesheets pending review...',
  '/manager/leave-approvals': 'Search leave registries...',
  '/manager/purchase-orders': 'Search purchase orders...',
  '/manager/notifications': 'Search manager alerts...',
};

const SIDEBAR_LINKS = [
  { to: '/manager/dashboard', label: 'Dashboard', icon: 'bi bi-speedometer2' },
  { to: '/manager/create-requisition', label: 'New Requisition', icon: 'bi bi-file-earmark-plus' },
  { to: '/manager/requisitions', label: 'My Requisitions', icon: 'bi bi-folder2-open' },
  { to: '/manager/vendor-submissions', label: 'Vendor Submissions', icon: 'bi bi-file-earmark-person' },
  { to: '/manager/interviews', label: 'Interviews Queue', icon: 'bi bi-calendar3' },
  { to: '/manager/assignments', label: 'Assignments', icon: 'bi bi-briefcase' },
  { to: '/manager/create-timesheet', label: 'Create Timesheet', icon: 'bi bi-clock-history' },
  { to: '/manager/timesheet-approvals', label: 'Weekly Timesheets', icon: 'bi bi-check2-square' },
  { to: '/manager/leave-approvals', label: 'Leave Registry', icon: 'bi bi-calendar-check' },
  { to: '/manager/purchase-orders', label: 'Purchase Orders', icon: 'bi bi-receipt' },
  { to: '/manager/invoice-creation', label: 'Invoice Generate', icon: 'bi bi-shield-check' },
  { to: '/manager/reports', label: 'Analytics Reports', icon: 'bi bi-bar-chart-line' },
];

function HiringManagerLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showSidebar, setShowSidebar] = useState(false);
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');

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

  const currentPath = location.pathname;
  const isSearchSupported = Object.keys(SEARCH_PLACEHOLDERS).some(path => currentPath.startsWith(path));
  const searchPlaceholder = SEARCH_PLACEHOLDERS[currentPath] || 'Search...';

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  useEffect(() => {
    setShowSidebar(false);
  }, [location.pathname]);

  const getInitials = () => {
    if (!user?.email) return 'M';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user?.email) return 'Manager';
    const namePart = user.email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  return (
    <div className="app-layout-shell">
      <header className="enterprise-global-header">
        <div className="container-fluid px-2 w-100 d-flex align-items-center justify-content-between flex-nowrap h-100">
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <button className="btn btn-link text-dark p-1 me-1 d-lg-none" onClick={toggleSidebar} aria-label="Toggle navigation">
              <i className="bi bi-list fs-4"></i>
            </button>
            <NavLink to="/manager/dashboard" className="navbar-brand d-flex align-items-center gap-1 m-0 fw-bold fs-6 text-decoration-none">
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
            userRoleBadge="Hiring Manager Portal"
            notificationsPath="/manager/notifications"
            profilePath="/manager/profile"
            userName={getDisplayName()}
            userInitials={getInitials()}
          />
          </div>
        </div>
      </header>

      <Sidebar
        brandName="GigForce"
        links={SIDEBAR_LINKS}
        userRole="Manager"
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

export default HiringManagerLayout;

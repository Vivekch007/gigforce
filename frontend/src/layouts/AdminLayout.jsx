import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const SEARCH_PLACEHOLDERS = {
  '/admin/dashboard': 'Search dashboard...',
  '/admin/users': 'Search users by ID, name, email...',
  '/admin/organizations': 'Search organizations by name...',
  '/admin/skills': 'Search skills in master catalog...',
  '/admin/audit-logs': 'Search audit trails...',
  '/admin/notifications': 'Search admin alerts...',
};

const SIDEBAR_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'bi bi-speedometer2' },
  { to: '/admin/users', label: 'Users', icon: 'bi bi-people' },
  { to: '/admin/organizations', label: 'Organizations', icon: 'bi bi-building' },
  { to: '/admin/skills', label: 'Skill Catalog', icon: 'bi bi-journal-check' },
];

function AdminLayout() {
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
    if (!user?.email) return 'A';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user?.email) return 'Admin User';
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
            <NavLink to="/admin/dashboard" className="navbar-brand d-flex align-items-center gap-1 m-0 fw-bold fs-6 text-decoration-none">
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
            userRoleBadge="Admin Workspace"
            notificationsPath="/admin/notifications"
            profilePath="/admin/profile"
            userName={getDisplayName()}
            userInitials={getInitials()}
          />
          </div>
        </div>
      </header>

      <Sidebar
        brandName="GigForce"
        links={SIDEBAR_LINKS}
        userRole="Admin"
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

export default AdminLayout;

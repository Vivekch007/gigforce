import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const SEARCH_PLACEHOLDERS = {
  '/finance/dashboard': 'Search Purchase Orders, Invoices, Payments...',
  '/finance/purchase-orders': 'Search purchase orders...',
  '/finance/invoices': 'Search invoices...',
  '/finance/payments': 'Search payments...',
  '/finance/processed-payments': 'Search processed payments...',
  '/finance/reports': 'Search financial reports...',
  '/finance/notifications': 'Search alerts...',
};

const SIDEBAR_LINKS = [
  { to: '/finance/dashboard', label: 'Dashboard', icon: 'bi bi-speedometer2' },
  { to: '/finance/purchase-orders', label: 'Purchase Orders', icon: 'bi bi-receipt' },
  { to: '/finance/invoices', label: 'Invoices Audit', icon: 'bi bi-shield-check' },
  { to: '/finance/payments', label: 'Payments Gate', icon: 'bi bi-credit-card' },
  { to: '/finance/processed-payments', label: 'Processed Payments', icon: 'bi bi-journal-check' },
  { to: '/finance/reports', label: 'Financial Reports', icon: 'bi bi-bar-chart' },
];

function FinanceLayout() {
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
    if (!user?.email) return 'F';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user?.email) return 'Finance User';
    const namePart = user.email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  return (
    <div className="app-layout-shell">
      <header className="enterprise-global-header">
        <div className="logo-container">
          <NavLink to="/finance/dashboard" className="gf-brand-logo">
            <i className="bi bi-briefcase-fill text-primary"></i>
            <span>GigForce</span>
          </NavLink>
        </div>
        <div className="main-header-nav">
          <Topbar
            searchPlaceholder={searchPlaceholder}
            searchVal={searchVal}
            onSearchChange={handleSearchChange}
            isSearchSupported={isSearchSupported}
            userRoleBadge="Finance Workspace"
            notificationsPath="/finance/notifications"
            profilePath="/finance/profile"
            userName={getDisplayName()}
            userInitials={getInitials()}
            toggleSidebar={toggleSidebar}
          />
        </div>
      </header>

      <Sidebar
        brandName="GigForce"
        links={SIDEBAR_LINKS}
        userRole="Finance"
        userName={getDisplayName()}
        userInitials={getInitials()}
        onLogout={handleLogout}
      />

      <div className="enterprise-layout-wrapper flex-grow-1">
        <main className="enterprise-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default FinanceLayout;

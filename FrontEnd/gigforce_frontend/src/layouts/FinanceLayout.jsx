import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/FinanceLayout.css';

// Contextual search placeholders based on the route
const SEARCH_PLACEHOLDERS = {
  '/finance/dashboard': 'Search Purchase Orders, Invoices, Payments...',
  '/finance/purchase-orders': 'Search purchase orders by ref, contractor...',
  '/finance/invoices': 'Search invoices by number, vendor...',
  '/finance/payments': 'Search payments by bank ref, amount...',
  '/finance/reports': 'Search financial reports...',
  '/finance/notifications': 'Search alerts feed...',
};

function FinanceLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');

  // Keep input value in sync when route or query params change
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

  // Toggle sidebar on mobile
  const toggleSidebar = () => setShowSidebar(!showSidebar);

  // Close sidebar on navigation change on mobile
  useEffect(() => {
    setShowSidebar(false);
  }, [location.pathname]);

  const getInitials = () => {
    if (!user?.email) return 'F';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getRoleText = () => {
    return 'Finance';
  };

  return (
    <div className="finance-container">
      {/* Sidebar Nav */}
      <aside className={`finance-sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/finance/dashboard" className="sidebar-brand">
            <span>GigForce</span>
            <span className="sidebar-badge">{getRoleText()}</span>
          </NavLink>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink 
              to="/finance/dashboard" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🏠</span> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/purchase-orders" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📋</span> Purchase Orders
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/invoices" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">💵</span> Invoices
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/payments" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">💳</span> Payments
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/reports" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📊</span> Reports
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/notifications" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🔔</span> Notifications
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/profile" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">👤</span> Profile
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-item w-100 border-0 bg-transparent text-start">
            <span className="fs-5">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="finance-main">
        {/* Topbar */}
        <header className="finance-topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={toggleSidebar}>
              ☰
            </button>
            
            {isSearchSupported && (
              <div className="topbar-search">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchVal}
                  onChange={handleSearchChange}
                />
              </div>
            )}
          </div>

          <div className="topbar-right">
            {/* Notifications Bell */}
            <NavLink to="/finance/notifications" className="notification-bell-btn">
              🔔
            </NavLink>

            {/* Profile Dropdown context */}
            <div className="topbar-user-dropdown d-flex align-items-center gap-2">
              <div className="user-avatar">{getInitials()}</div>
              <span className="d-none d-md-inline text-light small fw-medium">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Nested Page Content Outlet */}
        <main className="finance-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default FinanceLayout;

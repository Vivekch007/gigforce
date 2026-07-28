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

  const getDisplayName = () => {
    if (!user?.email) return '';
    const namePart = user.email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
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
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/purchase-orders" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Purchase Orders
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/invoices" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Invoices
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/payments" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Payments
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/reports" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Reports
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/notifications" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Notifications
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/finance/profile" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Profile
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-item w-100 border-0 bg-transparent text-start">
            Logout
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
            <NavLink to="/finance/notifications" className="notification-bell-btn d-flex align-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-bell" viewBox="0 0 16 16">
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
              </svg>
            </NavLink>

            {/* Profile Dropdown context */}
            <div className="topbar-user-dropdown d-flex align-items-center gap-2">
              <div className="user-avatar">{getInitials()}</div>
              <span className="d-none d-md-inline text-light small fw-medium">{getDisplayName()}</span>
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

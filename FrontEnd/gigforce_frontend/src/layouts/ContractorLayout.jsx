import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/ContractorLayout.css';

// Contextual search placeholders based on the route
const SEARCH_PLACEHOLDERS = {
  '/contractor/assignments': 'Search assignments by client, manager...',
  '/contractor/notifications': 'Search notifications...',
  '/contractor/profile': 'Search skills or certifications...',
};

function ContractorLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');

  // Keep the input value in sync when the route changes or URL parameters change
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

  // Find if search is supported on the current page
  const currentPath = location.pathname;
  const isSearchSupported = Object.keys(SEARCH_PLACEHOLDERS).some(path => currentPath.startsWith(path));
  const searchPlaceholder = SEARCH_PLACEHOLDERS[currentPath] || 'Search...';

  // Toggle sidebar on mobile
  const toggleSidebar = () => setShowSidebar(!showSidebar);

  // Close sidebar on navigation change on mobile
  useEffect(() => {
    setShowSidebar(false);
  }, [location.pathname]);

  // Extract initials for the avatar
  const getInitials = () => {
    if (!user?.email) return 'C';
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="contractor-container">
      {/* Sidebar Nav */}
      <aside className={`contractor-sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/contractor/dashboard" className="sidebar-brand">
            <span>GigForce</span>
            <span className="sidebar-badge">Contractor</span>
          </NavLink>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink 
              to="/contractor/dashboard" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🏠</span> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/contractor/profile" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">👤</span> My Profile
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/contractor/assignments" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📋</span> Assignments
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/contractor/timesheets" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">⏱️</span> Timesheets
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/contractor/absences" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🏖️</span> Leave & Absences
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/contractor/payments" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">💰</span> My Earnings
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/contractor/notifications" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🔔</span> Notifications
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
      <div className="contractor-main">
        {/* Topbar */}
        <header className="contractor-topbar">
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
            {/* Notifications Shortcut Link */}
            <NavLink to="/contractor/notifications" className="notification-bell-btn">
              🔔
            </NavLink>

            {/* Profile drop list */}
            <div className="topbar-user-dropdown d-flex align-items-center gap-2">
              <div className="user-avatar">{getInitials()}</div>
              <span className="d-none d-md-inline text-light small fw-medium">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="contractor-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ContractorLayout;

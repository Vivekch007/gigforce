import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/HiringManagerLayout.css';

// Contextual search placeholders based on the route
const SEARCH_PLACEHOLDERS = {
  '/manager/dashboard': 'Search Requisitions, Contractors, Vendors, Candidates...',
  '/manager/requisitions': 'Search requisitions by title, status...',
  '/manager/vendor-submissions': 'Search submissions by candidate, vendor...',
  '/manager/interviews': 'Search interviews by candidate, interviewer...',
  '/manager/assignments': 'Search assignments by contractor, vendor...',
  '/manager/timesheet-approvals': 'Search timesheets by contractor, status...',
  '/manager/leave-approvals': 'Search leaves by contractor, type...',
  '/manager/invoice-creation': 'Search timesheets ready for invoicing...',
  '/manager/reports': 'Search metrics and reports...',
  '/manager/notifications': 'Search notifications...',
};

function HiringManagerLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');

  // Keep the input value in sync when the route or query params change
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
    if (!user?.email) return 'M';
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="manager-container">
      {/* Sidebar Nav */}
      <aside className={`manager-sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/manager/dashboard" className="sidebar-brand">
            <span>GigForce</span>
            <span className="sidebar-badge">Manager</span>
          </NavLink>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink 
              to="/manager/dashboard" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🏠</span> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/create-requisition" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">➕</span> Create Requisition
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/requisitions" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📁</span> My Requisitions
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/vendor-submissions" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📥</span> Submissions
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/interviews" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📅</span> Interviews
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/assignments" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📋</span> Assignments
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/timesheet-approvals" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">⏱️</span> Timesheet Approvals
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/leave-approvals" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">🏖️</span> Leave Approvals
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/invoice-creation" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">💵</span> Invoice Creation
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/reports" 
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="fs-5">📊</span> Reports
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/manager/notifications" 
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
      <div className="manager-main">
        {/* Topbar */}
        <header className="manager-topbar">
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
            <NavLink to="/manager/notifications" className="notification-bell-btn">
              🔔
            </NavLink>

            {/* Profile context initials */}
            <div className="topbar-user-dropdown d-flex align-items-center gap-2">
              <div className="user-avatar">{getInitials()}</div>
              <span className="d-none d-md-inline text-light small fw-medium">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Nested Page Content Outlet */}
        <main className="manager-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default HiringManagerLayout;

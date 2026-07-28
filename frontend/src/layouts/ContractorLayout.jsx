import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { getMyProfile } from '../services/contractorService';
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
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (user) {
      getMyProfile()
        .then((profile) => {
          setProfileName(profile.displayName || profile.userName || user.email);
        })
        .catch(() => {
          const namePart = user.email.split('@')[0];
          setProfileName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
        });
    }
  }, [user]);

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
          </NavLink>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink
              to="/contractor/dashboard"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/contractor/assignments"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Assignments
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/contractor/timesheets"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Timesheets
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/contractor/absences"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              Leave & Absences
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/contractor/payments"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              My Earnings
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
      <div className="contractor-main">
        {/* Topbar */}
        <header className="contractor-topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={toggleSidebar}>
              ☰
            </button>
          </div>

          <div className="topbar-right">
            {isSearchSupported && (
              <div className="topbar-search topbar-search-sm">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchVal}
                  onChange={handleSearchChange}
                />
              </div>
            )}

            {/* Notifications Shortcut Link */}
            <NavLink to="/contractor/notifications" className="notification-bell-btn d-flex align-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-bell" viewBox="0 0 16 16">
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
              </svg>
            </NavLink>

            {/* Profile dropdown - avatar with name, no email in the navbar */}
            <Dropdown align="end">
              <Dropdown.Toggle as="div" id="contractor-user-menu" className="topbar-user-dropdown d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
                <span className="user-name-text text-light small fw-medium d-none d-sm-inline">{profileName}</span>
                <div className="user-avatar">{getInitials()}</div>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item as={NavLink} to="/contractor/profile">
                  My Profile
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
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

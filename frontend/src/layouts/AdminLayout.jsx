import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/AdminLayout.css';

// Contextual search placeholders
const SEARCH_PLACEHOLDERS = {
  '/admin/dashboard': 'Search Users, Roles, Logs...',
  '/admin/users': 'Search users by employee ID, name, email...',

  '/admin/organizations': 'Search organizations by name, code...',
  '/admin/skills': 'Search skills in master catalog...',
  '/admin/audit-logs': 'Search audit trails...',
  '/admin/notifications': 'Search admin alerts...',
};

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
    if (!user?.email) return '';
    const namePart = user.email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const getRoleText = () => {
    return 'Admin';
  };

  return (
    <div className="admin-container">
      {/* Sidebar Nav */}
      <aside className={`admin-sidebar ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/admin/dashboard" className="sidebar-brand">
            <span>GigForce</span>
            <span className="sidebar-badge">{getRoleText()}</span>
          </NavLink>
        </div>

        <ul className="sidebar-menu">
          <li>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              Users
            </NavLink>
          </li>

          <li>
            <NavLink to="/admin/organizations" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              Organizations
            </NavLink>
          </li>

          <li>
            <NavLink to="/admin/skills" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              Skill Catalog
            </NavLink>
          </li>

          <li>
            <NavLink to="/admin/audit-logs" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              Audit Logs
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/system-settings" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              System Settings
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/notifications" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              Notifications
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/profile" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
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
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
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
            <NavLink to="/admin/notifications" className="notification-bell-btn d-flex align-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-bell" viewBox="0 0 16 16">
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
              </svg>
            </NavLink>

            <div className="topbar-user-dropdown d-flex align-items-center gap-2">
              <div className="user-avatar">{getInitials()}</div>
              <span className="d-none d-md-inline text-light small fw-medium">{getDisplayName()}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

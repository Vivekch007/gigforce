import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/AdminLayout.css';

// Contextual search placeholders
const SEARCH_PLACEHOLDERS = {
  '/admin/dashboard': 'Search Users, Roles, Logs...',
  '/admin/users': 'Search users by employee ID, name, email...',
  '/admin/roles': 'Search roles...',
  '/admin/organizations': 'Search organizations by name, code...',
  '/admin/departments': 'Search departments...',
  '/admin/skills': 'Search skills in master catalog...',
  '/admin/designations': 'Search designations...',
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
              <span>🏠</span> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>👤</span> Users
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/roles" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>🔐</span> Roles & Perms
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/organizations" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>🏢</span> Organizations
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/departments" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>📂</span> Departments
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/skills" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>🏷️</span> Skill Catalog
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/designations" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>📋</span> Designation Catalog
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/audit-logs" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>📜</span> Audit Logs
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/system-settings" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>⚙️</span> System Settings
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/notifications" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>🔔</span> Notifications
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/profile" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span>👤</span> Profile
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-item w-100 border-0 bg-transparent text-start">
            <span>🚪</span> Logout
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
            <NavLink to="/admin/notifications" className="notification-bell-btn">
              🔔
            </NavLink>

            <div className="topbar-user-dropdown d-flex align-items-center gap-2">
              <div className="user-avatar">{getInitials()}</div>
              <span className="d-none d-md-inline text-light small fw-medium">{user?.email}</span>
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

import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar({ brandName = 'GigForce', links = [], userRole = '', userName = '', userInitials = '', onLogout }) {
  return (
    <aside className="enterprise-sidebar">
      
      <ul className="sidebar-menu-list">
        {links.map((link, idx) => (
          <li key={idx}>
            <NavLink
              to={link.to}
              className={({ isActive }) => `sidebar-item-link text-decoration-none ${isActive ? 'active' : ''}`}
            >
              <i className={link.icon}></i>
              <span>{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer-profile">
        <div className="d-flex align-items-center gap-2">
          <div className="topbar-avatar">{userInitials}</div>
          <div className="d-flex flex-column" style={{ minWidth: '0' }}>
            <span className="text-dark small fw-semibold text-truncate" style={{ maxWidth: '120px' }}>
              {userName}
            </span>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              {userRole}
            </span>
          </div>
        </div>
        {onLogout && (
          <button onClick={onLogout} className="sidebar-logout-btn border-0 bg-transparent p-2 d-inline-flex align-items-center justify-content-center rounded" title="Logout">
            <i className="bi bi-box-arrow-right" style={{ fontSize: '18px' }}></i>
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

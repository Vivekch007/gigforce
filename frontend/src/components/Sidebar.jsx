import React from 'react';
import { NavLink } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';

function Sidebar({ show, onHide, brandName = 'GigForce', links = [], userRole = '', userName = '', userInitials = '', onLogout }) {
  const sidebarContent = (
    <>
      <ul className="sidebar-menu-list mt-3">
        {links.map((link, idx) => (
          <li key={idx}>
            <NavLink
              to={link.to}
              className={({ isActive }) => `sidebar-item-link text-decoration-none ${isActive ? 'active' : ''}`}
              onClick={onHide} // Auto-close mobile sidebar on navigation
            >
              <i className={link.icon}></i>
              <span>{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer-profile mt-auto">
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="enterprise-sidebar d-none d-lg-flex">
        {sidebarContent}
      </aside>

      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas show={show} onHide={onHide} className="d-lg-none" style={{ width: '260px' }}>
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold fs-5 text-dark d-flex align-items-center gap-2">
            <i className="bi bi-briefcase-fill text-primary"></i> {brandName}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-0">
          {sidebarContent}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Sidebar;

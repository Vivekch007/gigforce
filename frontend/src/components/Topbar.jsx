import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  getUnreadCount, 
  getMyNotifications, 
  markNotificationAsRead, 
  dismissNotification 
} from '../services/notificationService';
import { Offcanvas } from 'react-bootstrap';

function Topbar({
  searchPlaceholder = 'Search...',
  searchVal = '',
  onSearchChange,
  isSearchSupported = false,
  userRoleBadge = '',
  notificationsPath = '/notifications',
  profilePath = '/profile',
  userName = '',
  userInitials = '',
  isAdmin = false // Pass true if the logged in user is Admin
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  // Check if role badge explicitly indicates Admin
  const isUserAdmin = isAdmin || userRoleBadge.toLowerCase().includes('admin');

  const fetchCount = () => {
    // Skip network request if user is Admin
    if (isUserAdmin) return;

    getUnreadCount()
      .then((count) => {
        setUnreadCount(Number(count || 0));
      })
      .catch((e) => {
        console.error('Failed to load unread notifications count', e);
      });
  };

  const fetchNotificationsList = () => {
    if (isUserAdmin) return;

    setLoading(true);
    getMyNotifications()
      .then((data) => {
        const normalized = (data || []).map((n) => ({
          id: n.notificationId || n.NotificationID || n.id,
          title: n.title || n.Title || n.category || n.Category || 'Alert',
          message: n.message || n.Message || '',
          status: (n.status || n.Status || 'READ').toUpperCase(),
          createdDate: n.createdDate || n.CreatedDate || n.createdAt,
        }));

        const active = normalized.filter((n) => n.status !== 'DISMISSED');
        setNotifications(active);
      })
      .catch((err) => {
        console.error('Failed to fetch notifications list', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isUserAdmin) return;

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [location.pathname, isUserAdmin]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleBellClick = (e) => {
    e.preventDefault();
    if (!isOpen) {
      fetchNotificationsList();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter((n) => n.status === 'UNREAD');
      await Promise.all(unreadList.map((n) => markNotificationAsRead(n.id)));

      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleDismiss = async (id, isUnread) => {
    try {
      await dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (isUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to dismiss notification', err);
    }
  };

  function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return (
    <div className="d-flex align-items-center flex-nowrap w-100 justify-content-end">
      <div className="d-flex align-items-center gap-1 ms-auto flex-shrink-1 overflow-hidden">

        {isSearchSupported && onSearchChange && (
          <div className="topbar-search-box p-1 p-sm-2">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={onSearchChange}
              className="form-control form-control-sm"
            />
          </div>
        )}

        {userRoleBadge && (
          <div className="badge bg-light text-dark border p-1 p-sm-2 fw-normal text-truncate navbar-workspace-badge ms-1 ms-sm-2 flex-shrink-1">
            <span className="d-inline-block text-truncate w-100">{userRoleBadge}</span>
          </div>
        )}
      </div>

      <div className="d-flex align-items-center gap-1 gap-sm-3 ms-2 flex-shrink-0">

        {/* Hide bell icon completely if user is Admin */}
        {!isUserAdmin && (
          <div className="position-relative d-inline-flex" ref={popoverRef}>
            <button
              className={`topbar-bell-btn text-decoration-none position-relative border-0 bg-transparent ${isOpen ? 'active' : ''}`}
              onClick={handleBellClick}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Toggle Notifications"
            >
              <i className="bi bi-bell" style={{ fontSize: '1.25rem' }}></i>
              {unreadCount > 0 && (
                <span
                  className="position-absolute translate-middle badge rounded-pill bg-danger"
                  style={{
                    top: '4px',
                    left: '26px',
                    fontSize: '10px',
                    padding: '4px 6px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--gf-card, #fff)'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {isOpen && (
              <div 
                className="position-absolute end-0 mt-2 bg-white shadow-lg border rounded-3 notification-popup-card" 
                style={{ zIndex: 1050 }}
              >
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light rounded-top-3">
                  <h6 className="fw-bold m-0 fs-6">Notifications</h6>
                  <div className="d-flex align-items-center gap-3">
                    {notifications.some((n) => n.status === 'UNREAD') && (
                      <button onClick={handleMarkAllRead} className="btn btn-link text-decoration-none p-0" style={{ fontSize: '0.80rem' }}>
                        Mark all read
                      </button>
                    )}
                    <button className="btn btn-link btn-sm text-muted p-0 text-decoration-none" onClick={() => setIsOpen(false)}>
                      <i className="bi bi-x fs-5"></i>
                    </button>
                  </div>
                </div>

                {/* List Content */}
                <div className="notification-list-body p-2 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-muted">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading...
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notif) => {
                      const isUnread = notif.status === 'UNREAD';
                      return (
                        <div
                          key={notif.id}
                          className={`card mb-2 p-2 border position-relative ${isUnread ? 'border-primary bg-light' : 'bg-white'}`}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <strong className="fs-7 pe-3">{notif.title}</strong>
                            <button
                              className="btn-close btn-close-xs position-absolute top-0 end-0 mt-2 me-2"
                              onClick={() => handleDismiss(notif.id, isUnread)}
                              title="Dismiss"
                            ></button>
                          </div>
                          <p className="small text-muted mb-1 fs-7 pe-1">{notif.message}</p>
                          <span className="text-muted text-end d-block" style={{ fontSize: '0.7rem' }}>
                            {formatRelativeTime(notif.createdDate)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="notification-empty-state text-center py-4 text-muted">
                      <i className="bi bi-inbox d-block mb-2 text-secondary" style={{ fontSize: '1.5rem' }}></i>
                      <p className="mb-0 small fs-7">You're all caught up! No new notifications.</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-2 border-top text-center bg-light rounded-bottom-3">
                  <button
                    className="btn btn-link text-primary text-decoration-none small fw-semibold fs-7 p-0"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(notificationsPath);
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <NavLink
          to={profilePath}
          className={({ isActive }) => `topbar-profile-area text-decoration-none d-flex align-items-center gap-2 ${isActive ? 'active-profile' : ''}`}
        >
          {userName && <span className="d-none d-md-inline text-dark small fw-medium">{userName}</span>}
          {userInitials && <div className="topbar-avatar">{userInitials}</div>}
        </NavLink>
      </div>
    </div>
  );
}

export default Topbar;
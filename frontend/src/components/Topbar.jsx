import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  getUnreadCount, 
  getMyNotifications, 
  markNotificationAsRead, 
  dismissNotification 
} from '../services/notificationService';

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
  toggleSidebar
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  const fetchCount = () => {
    getUnreadCount()
      .then((count) => {
        setUnreadCount(Number(count || 0));
      })
      .catch((e) => {
        console.error('Failed to load unread notifications count', e);
      });
  };

  const fetchNotificationsList = () => {
    setLoading(true);
    getMyNotifications()
      .then((data) => {
        // Filter out dismissed notifications if any status dismissed exists
        const active = (data || []).filter(n => n.Status !== 'DISMISSED');
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
    fetchCount();
    // Poll every 30 seconds for live count updates
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

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
      const unreadList = notifications.filter(n => n.Status === 'UNREAD');
      await Promise.all(unreadList.map(n => markNotificationAsRead(n.NotificationID)));
      
      setNotifications(prev => prev.map(n => ({ ...n, Status: 'READ' })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleDismiss = async (id, isUnread) => {
    try {
      await dismissNotification(id);
      setNotifications(prev => prev.filter(n => n.NotificationID !== id));
      if (isUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
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
    <header className="enterprise-topbar">
      <div className="d-flex align-items-center gap-3">
        {toggleSidebar && (
          <button className="btn btn-enterprise-secondary d-md-none p-1 px-2" onClick={toggleSidebar}>
            <i className="bi bi-list"></i>
          </button>
        )}

        {isSearchSupported && onSearchChange && (
          <div className="topbar-search-box">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={onSearchChange}
            />
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {userRoleBadge && <span className="topbar-role-badge">{userRoleBadge}</span>}

        <div className="position-relative d-inline-flex" ref={popoverRef}>
          <button 
            className={`topbar-bell-btn text-decoration-none position-relative border-0 bg-transparent ${isOpen ? 'active' : ''}`}
            onClick={handleBellClick}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle Notifications"
          >
            <i className="bi bi-bell"></i>
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
                  border: '2px solid var(--gf-card)'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="notification-popover">
              <div className="notification-popover-header">
                <h6>Notifications</h6>
                {notifications.some(n => n.Status === 'UNREAD') && (
                  <button onClick={handleMarkAllRead}>Mark all as read</button>
                )}
              </div>

              <div className="notification-list">
                {loading ? (
                  <div className="p-4 text-center text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Loading...
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const isUnread = notif.Status === 'UNREAD';
                    return (
                      <div 
                        key={notif.NotificationID} 
                        className={`notification-card ${isUnread ? 'unread' : ''}`}
                      >
                        <button 
                          className="notification-dismiss-btn" 
                          onClick={() => handleDismiss(notif.NotificationID, isUnread)}
                          title="Dismiss"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                        <h6 className="notification-card-title">
                          {notif.Title || notif.Category || 'Alert'}
                        </h6>
                        <p className="notification-card-msg">{notif.Message}</p>
                        <span className="notification-card-time">
                          {formatRelativeTime(notif.CreatedDate)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="notification-empty-state">
                    <i className="bi bi-inbox text-muted"></i>
                    <p>You're all caught up! No new notifications.</p>
                  </div>
                )}
              </div>

              <div className="notification-popover-footer">
                <button 
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

        <NavLink 
          to={profilePath} 
          className={({ isActive }) => `topbar-profile-area text-decoration-none d-flex align-items-center gap-2 ${isActive ? 'active-profile' : ''}`}
        >
          {userName && <span className="d-none d-md-inline text-dark small fw-medium">{userName}</span>}
          {userInitials && <div className="topbar-avatar">{userInitials}</div>}
        </NavLink>
      </div>
    </header>
  );
}

export default Topbar;

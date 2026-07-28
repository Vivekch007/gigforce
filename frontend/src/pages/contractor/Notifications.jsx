import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Button, Card, ButtonGroup } from 'react-bootstrap';
import { getMyNotifications, markNotificationAsRead, dismissNotification } from '../../services/notificationService';
import { getErrorMessage } from '../../services/errorUtils';
import '../../styles/contractor.css';

function Notifications() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  
  // Tab/Category Filter: ALL | UNREAD | ASSIGNMENT | TIMESHEET | PAYMENT
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);

  const loadNotifications = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError('');
      const data = await getMyNotifications();
      // Sort by CreatedDate descending
      const sorted = (data || []).sort(
        (a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime()
      );
      setNotifications(sorted);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    setActionLoading(true);
    try {
      await markNotificationAsRead(id);
      await loadNotifications(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async (id) => {
    setActionLoading(true);
    try {
      await dismissNotification(id);
      await loadNotifications(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => n.Status === 'UNREAD');
    if (unread.length === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(unread.map((n) => markNotificationAsRead(n.NotificationID)));
      await loadNotifications(false);
      alert('All notifications marked as read!');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Local Filter
  const filteredNotifications = notifications.filter((n) => {
    // 1. Status/Category tab filters
    if (categoryFilter === 'UNREAD') {
      if (n.Status !== 'UNREAD') return false;
    } else if (categoryFilter !== 'ALL') {
      if (n.Category !== categoryFilter) return false;
    }

    // 2. Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (n.Title && n.Title.toLowerCase().includes(query)) ||
      (n.Message && n.Message.toLowerCase().includes(query)) ||
      (n.Category && n.Category.toLowerCase().includes(query))
    );
  });

  // Group notifications by time headers
  const getGroupedNotifications = () => {
    const todayList = [];
    const yesterdayList = [];
    const thisWeekList = [];
    const earlierList = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    filteredNotifications.forEach((n) => {
      const created = new Date(n.CreatedDate);
      if (created >= today) {
        todayList.push(n);
      } else if (created >= yesterday) {
        yesterdayList.push(n);
      } else if (created >= oneWeekAgo) {
        thisWeekList.push(n);
      } else {
        earlierList.push(n);
      }
    });

    return [
      { title: 'Today', items: todayList },
      { title: 'Yesterday', items: yesterdayList },
      { title: 'This Week', items: thisWeekList },
      { title: 'Earlier', items: earlierList },
    ];
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'TIMESHEET':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clock-history text-indigo-600" viewBox="0 0 16 16">
            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342zm1.37.71a7 7 0 0 0-.439-.453l.693-.72a8 8 0 0 1 .528.532zm2.137 2.137a7 7 0 0 0-.532-.528l.72-.693c.277.29.53.593.77.925zM16 8A8 8 0 1 1 8 0a8 8 0 0 1 8 8"/>
          </svg>
        );
      case 'PAYMENT':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-cash-coin text-green-600" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8m5-4a5 5 0 1 1-10 0 5 5 0 0 1 10 0"/>
          </svg>
        );
      case 'ASSIGNMENT':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-briefcase text-blue-600" viewBox="0 0 16 16">
            <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle text-slate-600" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          </svg>
        );
    }
  };

  const grouped = getGroupedNotifications();
  const totalUnread = notifications.filter((n) => n.Status === 'UNREAD').length;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Notifications</h2>
          <p className="text-muted small mt-1 mb-0">Manage system alerts and review logs.</p>
        </div>
        {totalUnread > 0 && (
          <Button 
            variant="outline-primary" 
            className="btn-gf-outline" 
            onClick={handleMarkAllRead}
            disabled={actionLoading}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {/* Filter Row */}
      <div className="d-flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: `Unread (${totalUnread})` },
        ].map((f) => (
          <Button
            key={f.key}
            variant={categoryFilter === f.key ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => setCategoryFilter(f.key)}
            className={categoryFilter === f.key ? 'btn-gf-primary' : 'btn-gf-outline border-secondary text-secondary'}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {searchQuery && (
        <div className="mb-3 text-muted small">
          Showing search results for: &ldquo;<strong>{searchQuery}</strong>&rdquo;
        </div>
      )}

      {/* Grouped Feeds */}
      {filteredNotifications.length > 0 ? (
        grouped.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              <h6 className="fw-bold text-uppercase text-slate-500 mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                {group.title}
              </h6>
              
              <div className="d-flex flex-column gap-3">
                {group.items.map((n) => (
                  <Card 
                    key={n.NotificationID} 
                    className={`gf-card p-3 mb-0 border-0 ${n.Status === 'UNREAD' ? 'border-start border-primary border-4 shadow-sm' : ''}`}
                    style={{ backgroundColor: n.Status === 'UNREAD' ? '#ffffff' : '#f8fafc' }}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap flex-md-nowrap">
                      <div className="d-flex gap-3">
                        <div className="metric-icon-box bg-light border" style={{ minWidth: '40px', width: '40px', height: '40px' }}>
                          {getCategoryIcon(n.Category)}
                        </div>
                        <div>
                          <h6 className={`fw-bold mb-1 ${n.Status === 'UNREAD' ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.Title || n.Category}
                          </h6>
                          <p className="small mb-1 text-slate-600">{n.Message}</p>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(n.CreatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3 ms-auto">
                        {n.Status === 'UNREAD' && (
                          <Button 
                            variant="link" 
                            className="p-1 text-primary text-decoration-none small fw-semibold text-xs" 
                            onClick={() => handleMarkRead(n.NotificationID)}
                            disabled={actionLoading}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button 
                          variant="link" 
                          className="p-1 text-muted text-decoration-none fs-5 fw-bold line-height-1" 
                          onClick={() => handleDismiss(n.NotificationID)}
                          disabled={actionLoading}
                          title="Dismiss"
                          style={{ border: 'none', background: 'none' }}
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-5 gf-card">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-bell-slash text-muted mb-3" viewBox="0 0 16 16">
            <path d="M5.164 14H15c-.3-.199-.557-.553-.78-1-.9-1.8-1.22-5.12-1.22-6 0-.264-.02-.524-.06-.776l-.996.996c.036.257.056.516.056.78 0 .628.134 2.197.459 3.742.16.767.376 1.566.663 2.258H6.164zm5.581-9.91a3.986 3.986 0 0 0-1.948-1.01 1 1 0 1 0-1.594 0 4 4 0 0 0-2.678 3.82c0 .628-.134 2.197-.459 3.742-.053.254-.112.51-.176.766L1.116 3.32a.5.5 0 0 0-.708-.708l13 13a.5.5 0 0 0 .708-.708z"/>
          </svg>
          <p className="text-muted small mt-2 mb-0">No notifications found.</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

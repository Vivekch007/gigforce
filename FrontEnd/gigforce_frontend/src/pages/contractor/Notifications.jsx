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
      case 'TIMESHEET': return '⏱️';
      case 'PAYMENT': return '💰';
      case 'ASSIGNMENT': return '💼';
      case 'COMPLIANCE': return '🛡️';
      default: return '⚙️';
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
          { key: 'ASSIGNMENT', label: 'Assignments' },
          { key: 'TIMESHEET', label: 'Timesheets' },
          { key: 'PAYMENT', label: 'Payments' },
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
                      <div className="d-flex gap-2 ms-auto">
                        {n.Status === 'UNREAD' && (
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => handleMarkRead(n.NotificationID)}
                            disabled={actionLoading}
                            className="text-xs"
                          >
                            ✓ Read
                          </Button>
                        )}
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleDismiss(n.NotificationID)}
                          disabled={actionLoading}
                          className="text-xs"
                        >
                          Dismiss
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
          <span className="fs-1">🔔</span>
          <p className="text-muted small mt-2 mb-0">No notifications found.</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

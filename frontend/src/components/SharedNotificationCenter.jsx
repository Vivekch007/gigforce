import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Button, Card } from 'react-bootstrap';
import { getMyNotifications, markNotificationAsRead, markNotificationAsUnread, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } from '../services/notificationService';
import { getErrorMessage } from '../services/errorUtils';
import { useToast } from '../context/ToastContext';

function SharedNotificationCenter({ title = "Notifications", subtitle = "Manage system alerts and review logs." }) {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  const [statusFilter, setStatusFilter] = useState('UNREAD');
  const [actionLoading, setActionLoading] = useState(false);

  const loadNotifications = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError('');
      const data = await getMyNotifications();
      const sorted = (data || []).sort(
        (a, b) => new Date(b.createdDate || b.CreatedDate).getTime() - new Date(a.createdDate || a.CreatedDate).getTime()
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

  const handleMarkUnread = async (id) => {
    setActionLoading(true);
    try {
      await markNotificationAsUnread(id);
      await loadNotifications(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await deleteNotification(id);
      await loadNotifications(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => (n.status || n.Status) === 'UNREAD');
    if (unread.length === 0) return;
    setActionLoading(true);
    try {
      await markAllNotificationsAsRead();
      await loadNotifications(false);
      addToast('Success', 'All notifications marked as read!', 'success');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    setActionLoading(true);
    try {
      await deleteAllNotifications();
      await loadNotifications(false);
      addToast('Success', 'All notifications cleared!', 'success');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const stat = n.status || n.Status;
    if (stat !== statusFilter) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const t = n.title || n.Title || '';
    const m = n.message || n.Message || '';
    const c = n.category || n.Category || '';
    return (
      t.toLowerCase().includes(query) ||
      m.toLowerCase().includes(query) ||
      c.toLowerCase().includes(query)
    );
  });

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
      const created = new Date(n.createdDate || n.CreatedDate);
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
    const cat = (category || '').toUpperCase();
    switch (cat) {
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
  const totalUnread = notifications.filter((n) => (n.status || n.Status) === 'UNREAD').length;
  const totalNotifications = notifications.length;

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
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">{title}</h2>
          <p className="text-muted small mt-1 mb-0">{subtitle}</p>
        </div>
        <div className="d-flex gap-2">
          {totalUnread > 0 && statusFilter === 'UNREAD' && (
            <Button
              variant="outline-primary"
              className="btn-gf-outline"
              onClick={handleMarkAllRead}
              disabled={actionLoading}
            >
              Mark All Read
            </Button>
          )}
          {totalNotifications > 0 && (
            <Button
              variant="outline-danger"
              className="btn-gf-outline"
              onClick={handleClearAll}
              disabled={actionLoading}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <div className="d-flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'UNREAD', label: 'Unread' },
          { key: 'READ', label: 'Read' },
        ].map((f) => (
          <Button
            key={f.key}
            variant={statusFilter === f.key ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => setStatusFilter(f.key)}
            className={statusFilter === f.key ? 'btn-gf-primary' : 'btn-gf-outline border-secondary text-secondary'}
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

      {filteredNotifications.length > 0 ? (
        grouped.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              <h6 className="fw-bold text-uppercase text-slate-500 mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                {group.title}
              </h6>

              <div className="d-flex flex-column gap-3">
                {group.items.map((n) => {
                  const id = n.notificationId || n.NotificationID;
                  const stat = n.status || n.Status;
                  const cat = n.category || n.Category;
                  const t = n.title || n.Title || cat;
                  const m = n.message || n.Message;
                  const d = n.createdDate || n.CreatedDate;

                  return (
                    <Card
                      key={id}
                      className={`gf-card p-3 mb-0 border-0 ${stat === 'UNREAD' ? 'border-start border-primary border-4 shadow-sm' : ''}`}
                      style={{ backgroundColor: stat === 'UNREAD' ? '#ffffff' : '#f8fafc' }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap flex-md-nowrap">
                        <div className="d-flex gap-3">
                          <div className="metric-icon-box bg-light border" style={{ minWidth: '40px', width: '40px', height: '40px' }}>
                            {getCategoryIcon(cat)}
                          </div>
                          <div>
                            <h6 className={`fw-bold mb-1 ${stat === 'UNREAD' ? 'text-slate-900' : 'text-slate-700'}`}>
                              {t}
                            </h6>
                            <p className="small mb-1 text-slate-600">{m}</p>
                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-3 ms-auto">
                          {stat === 'UNREAD' && (
                            <Button
                              variant="link"
                              className="p-1 text-primary text-decoration-none small fw-semibold text-xs"
                              onClick={() => handleMarkRead(id)}
                              disabled={actionLoading}
                            >
                              Mark Read
                            </Button>
                          )}
                          {stat === 'READ' && (
                            <Button
                              variant="link"
                              className="p-1 text-primary text-decoration-none small fw-semibold text-xs"
                              onClick={() => handleMarkUnread(id)}
                              disabled={actionLoading}
                            >
                              Mark Unread
                            </Button>
                          )}
                          <Button
                            variant="link"
                            className="p-1 text-danger text-decoration-none"
                            onClick={() => handleDelete(id)}
                            disabled={actionLoading}
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash3" viewBox="0 0 16 16">
                              <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-5 gf-card">
          <p className="text-muted small mt-2 mb-0">No notifications found.</p>
        </div>
      )}
    </div>
  );
}

export default SharedNotificationCenter;

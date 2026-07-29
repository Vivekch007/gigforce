import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Button, Card, ButtonGroup } from 'react-bootstrap';
import { getMyNotifications, markNotificationAsRead, dismissNotification, deleteNotification } from '../../services/notificationService';
import { getErrorMessage } from '../../services/errorUtils';

function Notifications() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Notifications feed
  const [notifications, setNotifications] = useState([]);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyNotifications();
      setNotifications(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDismiss = async (id) => {
    try {
      await dismissNotification(id);
      loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setSuccess('Alert cleared successfully.');
      loadNotifications();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Grouping helpers
  const groupNotifications = (list) => {
    const today = [];
    const yesterday = [];
    const thisWeek = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfThisWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;

    list.forEach((notif) => {
      // NOTE: Notifications are serialized in PascalCase
      const cDate = notif.CreatedDate ? new Date(notif.CreatedDate).getTime() : 0;
      
      if (cDate >= startOfToday) {
        today.push(notif);
      } else if (cDate >= startOfYesterday) {
        yesterday.push(notif);
      } else if (cDate >= startOfThisWeek) {
        thisWeek.push(notif);
      } else {
        earlier.push(notif);
      }
    });

    return { today, yesterday, thisWeek, earlier };
  };

  // Local filtering logic
  const filteredNotifications = notifications.filter((notif) => {
    // 1. Category Filter
    if (categoryFilter !== 'ALL') {
      if (notif.Category?.toUpperCase() !== categoryFilter) {
        return false;
      }
    }
    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchTitle = notif.Title?.toLowerCase().includes(q);
      const matchMsg = notif.Message?.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }
    return true;
  });

  const { today, yesterday, thisWeek, earlier } = groupNotifications(filteredNotifications);

  const getCategoryIcon = (category) => {
    const cat = category?.toUpperCase() || '';
    if (cat === 'REQUISITION' || cat === 'ASSIGNMENT') return 'bi-clipboard-check';
    if (cat === 'INTERVIEW') return 'bi-calendar-event';
    if (cat === 'TIMESHEET') return 'bi-clock-history';
    if (cat === 'LEAVE') return 'bi-calendar-x';
    if (cat === 'INVOICE' || cat === 'PAYMENT') return 'bi-wallet2';
    if (cat === 'SUCCESS') return 'bi-check-circle';
    if (cat === 'WARNING') return 'bi-exclamation-circle';
    if (cat === 'INFO' || cat === 'INFORMATION') return 'bi-info-circle';
    return 'bi-bell';
  };

  const renderGroupSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h6 className="fw-bold text-slate-800 border-bottom pb-2 mb-3">{title}</h6>
        <div className="d-flex flex-column gap-3">
          {items.map((notif) => (
            <Card key={notif.NotificationID} className={`gf-card p-3 mb-0 border-0 ${notif.Status === 'UNREAD' ? 'bg-light border-start border-4 border-primary' : 'bg-white'}`}>
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div className="d-flex gap-3">
                  <span className="fs-4 d-inline-flex align-items-center justify-content-center bg-light border rounded text-muted" style={{ width: '40px', height: '40px' }}>
                    <i className={`bi ${getCategoryIcon(notif.Category)}`}></i>
                  </span>
                  <div>
                    <h6 className={`mb-1 fw-bold ${notif.Status === 'UNREAD' ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.Title || notif.Category}
                    </h6>
                    <p className="text-slate-600 small mb-0">{notif.Message}</p>
                    <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>{new Date(notif.CreatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="d-flex gap-1 align-items-center">
                  {notif.Status === 'UNREAD' && (
                    <Button size="sm" variant="outline-primary" className="py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => handleMarkRead(notif.NotificationID)}>
                      Read
                    </Button>
                  )}
                  <Button size="sm" variant="outline-secondary" className="py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => handleDismiss(notif.NotificationID)}>
                    Dismiss
                  </Button>
                  <Button size="sm" variant="outline-danger" className="py-0 px-2 border-0" style={{ fontSize: '0.75rem' }} onClick={() => handleDelete(notif.NotificationID)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Notifications</h2>
        <p className="text-muted small mt-1 mb-0">Review system activity alerts, candidate proposals, and billing approvals feed.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Category filters */}
      <div className="mb-4 overflow-auto py-1">
        <ButtonGroup className="d-flex flex-wrap flex-md-nowrap gap-1">
          {['ALL', 'REQUISITION', 'INTERVIEW', 'TIMESHEET', 'LEAVE', 'INVOICE'].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'primary' : 'outline-primary'}
              className="py-1 px-3 fs-6 rounded-pill"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'ALL' ? 'All Alerts' : cat.toLowerCase()}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading alert feeds...</p>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div>
          {renderGroupSection('Today', today)}
          {renderGroupSection('Yesterday', yesterday)}
          {renderGroupSection('This Week', thisWeek)}
          {renderGroupSection('Earlier', earlier)}
        </div>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <i className="bi bi-bell-slash fs-1 text-muted"></i>
          <p className="text-muted small mt-2 mb-0">Your notification center is empty.</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Card, Button, ButtonGroup } from 'react-bootstrap';
import { getAdminNotifications } from '../../services/adminNotificationService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Notifications() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Notifications feed
  const [notifications, setNotifications] = useState([]);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getAdminNotifications();
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

  const groupNotifications = (list) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    list.forEach((notif) => {
      const cDate = notif.CreatedDate ? new Date(notif.CreatedDate).getTime() : 0;
      
      if (cDate >= startOfToday) {
        today.push(notif);
      } else if (cDate >= startOfYesterday) {
        yesterday.push(notif);
      } else {
        earlier.push(notif);
      }
    });

    return { today, yesterday, earlier };
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (categoryFilter !== 'ALL') {
      if (notif.Category?.toUpperCase() !== categoryFilter) {
        return false;
      }
    }
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const matchTitle = notif.Title?.toLowerCase().includes(q);
      const matchMsg = notif.Message?.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }
    return true;
  });

  const { today, yesterday, earlier } = groupNotifications(filteredNotifications);

  const getCategoryIcon = (category) => {
    const cat = category?.toUpperCase() || '';
    if (cat === 'SECURITY') return 'bi-shield-exclamation';
    if (cat === 'USERS') return 'bi-people';
    if (cat === 'SYSTEM') return 'bi-gear';
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
        <h2 className="fw-black text-slate-800 mb-0">Security Alerts center</h2>
        <p className="text-muted small mt-1 mb-0">Audit security events logs, system policy validations, and platform user logins warnings.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {/* Category filters */}
      <div className="mb-4 overflow-auto py-1">
        <ButtonGroup className="d-flex flex-wrap flex-md-nowrap gap-1">
          {['ALL', 'SECURITY', 'USERS', 'SYSTEM'].map((cat) => (
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
        <LoadingSpinner message="Querying platform security trails..." />
      ) : filteredNotifications.length > 0 ? (
        <div>
          {renderGroupSection('Today', today)}
          {renderGroupSection('Yesterday', yesterday)}
          {renderGroupSection('Earlier', earlier)}
        </div>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <i className="bi bi-bell-slash fs-1 text-muted"></i>
          <p className="text-muted small mt-2 mb-0">No active security alerts.</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

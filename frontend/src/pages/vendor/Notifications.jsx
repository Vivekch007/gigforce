import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Alert, Button, Card, ButtonGroup } from 'react-bootstrap';
import { getMyNotifications } from '../../services/vendorNotificationService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function Notifications() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

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

  // Grouping helper
  const groupNotifications = (list) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    list.forEach((notif) => {
      // NOTE: Notifications are serialized in PascalCase
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

  // Local filtering logic
  const filteredNotifications = notifications.filter((notif) => {
    // 1. Category Filter
    if (categoryFilter !== 'ALL') {
      if (notif.Category?.toUpperCase() !== categoryFilter) {
        return false;
      }
    }
    // 2. Search query filter
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const matchTitle = notif.Title?.toLowerCase().includes(q);
      const matchMsg = notif.Message?.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }
    return true;
  });

  const { today, yesterday, earlier } = groupNotifications(filteredNotifications);

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
                  <span className="fs-4">
                    {notif.Category?.toUpperCase() === 'CANDIDATE' ? '👤' :
                     notif.Category?.toUpperCase() === 'INTERVIEW' ? '📅' :
                     notif.Category?.toUpperCase() === 'ASSIGNMENT' ? '📋' :
                     notif.Category?.toUpperCase() === 'PURCHASE_ORDER' ? '💵' :
                     notif.Category?.toUpperCase() === 'REQUISITION' ? '💼' : '🔔'}
                  </span>
                  <div>
                    <h6 className={`mb-1 fw-bold ${notif.Status === 'UNREAD' ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notif.Title || notif.Category}
                    </h6>
                    <p className="text-slate-600 small mb-0">{notif.Message}</p>
                    <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>{new Date(notif.CreatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
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
        <p className="text-muted small mt-1 mb-0">Review system activity alerts, candidate updates, and purchase order approvals feed.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {/* Category filters */}
      <div className="mb-4 overflow-auto py-1">
        <ButtonGroup className="d-flex flex-wrap flex-md-nowrap gap-1">
          {['ALL', 'CANDIDATE', 'INTERVIEW', 'ASSIGNMENT', 'PURCHASE_ORDER', 'REQUISITION'].map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? 'primary' : 'outline-primary'}
              className="py-1 px-3 fs-6 rounded-pill"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'ALL' ? 'All Alerts' : cat.toLowerCase().replace('_', ' ')}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading alerts feed..." />
      ) : filteredNotifications.length > 0 ? (
        <div>
          {renderGroupSection('Today', today)}
          {renderGroupSection('Yesterday', yesterday)}
          {renderGroupSection('Earlier', earlier)}
        </div>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">🔔</span>
          <p className="text-muted small mt-2 mb-0">Your notification center is empty.</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

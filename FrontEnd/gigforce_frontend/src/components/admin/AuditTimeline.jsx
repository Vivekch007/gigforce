import React from 'react';

function AuditTimeline({ logs }) {
  if (!logs || logs.length === 0) {
    return <p className="text-muted small mb-0 py-2">No audit logs registered.</p>;
  }

  return (
    <div className="gf-timeline small">
      {logs.map((log) => (
        <div className="timeline-item" key={log.id}>
          <div className="timeline-time" style={{ minWidth: '75px' }}>
            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="timeline-title fw-bold text-slate-800">{log.action}</div>
          <div className="timeline-desc text-slate-600">
            {log.entity} &bull; {log.user}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AuditTimeline;

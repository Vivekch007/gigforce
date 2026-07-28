import React from 'react';

function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return <p className="text-muted small mb-0 py-2">No recent financial logs.</p>;
  }

  return (
    <div className="gf-timeline">
      {activities.map((act) => (
        <div className="timeline-item" key={act.id}>
          <div className="timeline-time">
            {new Date(act.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className="timeline-title">{act.title}</div>
          <div className="timeline-desc text-truncate" style={{ maxWidth: '220px' }}>
            {act.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityTimeline;

import React from 'react';

function KpiCard({ label, value, icon, trend, className = '' }) {
  const getTrendIcon = (direction) => {
    if (direction === 'up') return 'bi-arrow-up-short';
    if (direction === 'down') return 'bi-arrow-down-short';
    return 'bi-exclamation-circle-fill';
  };

  return (
    <div className={`enterprise-kpi-card h-100 d-flex flex-column justify-content-between ${className}`}>
      <div className="kpi-card-header text-truncate" style={{ minHeight: '24px' }}>
        <span className="kpi-card-label text-truncate" style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{label}</span>
        {icon && <i className={`bi ${icon} kpi-card-icon`}></i>}
      </div>
      <div className="kpi-card-body d-flex flex-column justify-content-end flex-grow-1 mt-2">
        <h3 className="kpi-card-number text-truncate mb-2">{value}</h3>
        <div>
        {trend && (
          <span className={`kpi-card-trend ${trend.direction || 'up'}`}>
            <i className={`bi ${getTrendIcon(trend.direction)}`}></i> {trend.value}
          </span>
        )}
        </div>
      </div>
    </div>
  );
}

export default KpiCard;

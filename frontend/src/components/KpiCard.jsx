import React from 'react';

function KpiCard({ label, value, icon, trend, className = '' }) {
  const getTrendIcon = (direction) => {
    if (direction === 'up') return 'bi-arrow-up-short';
    if (direction === 'down') return 'bi-arrow-down-short';
    return 'bi-exclamation-circle-fill';
  };

  return (
    <div className={`enterprise-kpi-card ${className}`}>
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        {icon && <i className={`bi ${icon} kpi-card-icon`}></i>}
      </div>
      <div className="kpi-card-body">
        <h3 className="kpi-card-number">{value}</h3>
        {trend && (
          <span className={`kpi-card-trend ${trend.direction || 'up'}`}>
            <i className={`bi ${getTrendIcon(trend.direction)}`}></i> {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export default KpiCard;

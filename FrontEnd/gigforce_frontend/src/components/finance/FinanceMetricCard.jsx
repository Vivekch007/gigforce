import React from 'react';

function FinanceMetricCard({ title, value, desc, borderStartClass = '' }) {
  return (
    <div className={`gf-card mb-0 p-3 h-100 bg-white ${borderStartClass}`}>
      <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>{title}</span>
      <h3 className="fw-black text-slate-800 mt-1 mb-0">{value}</h3>
      {desc && <p className="text-muted small mb-0 mt-2">{desc}</p>}
    </div>
  );
}

export default FinanceMetricCard;

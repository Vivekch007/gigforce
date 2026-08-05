import React from 'react';

function EmptyState({ icon = '📂', message = 'No records found.' }) {
  const isBootstrapIcon = typeof icon === 'string' && icon.includes('bi-');
  return (
    <div className="text-center py-5 gf-card bg-white border-0">
      {isBootstrapIcon ? (
        <i className={icon} style={{ fontSize: '2.5rem' }}></i>
      ) : (
        <span className="fs-1">{icon}</span>
      )}
      <p className="text-muted small mt-2 mb-0">{message}</p>
    </div>
  );
}

export default EmptyState;

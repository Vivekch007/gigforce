import React from 'react';

function EmptyState({ icon = '📂', message = 'No records found.' }) {
  return (
    <div className="text-center py-5 gf-card bg-white border-0">
      <span className="fs-1">{icon}</span>
      <p className="text-muted small mt-2 mb-0">{message}</p>
    </div>
  );
}

export default EmptyState;

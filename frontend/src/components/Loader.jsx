import React from 'react';
import { Spinner } from 'react-bootstrap';

function Loader({ variant = 'spinner', rows = 3, message = 'Loading...' }) {
  if (variant === 'skeleton') {
    return (
      <div className="d-flex flex-column gap-3 w-100 p-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="d-flex flex-column gap-2 placeholder-glow w-100">
            <div className="placeholder col-12 rounded" style={{ height: '24px', opacity: 0.12 }}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center py-5 w-100">
      <Spinner animation="border" variant="primary" style={{ borderWidth: '2px', width: '1.75rem', height: '1.75rem' }} />
      {message && <span className="ms-3 text-muted small fw-medium">{message}</span>}
    </div>
  );
}

export default Loader;

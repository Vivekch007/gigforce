import React from 'react';
import { Spinner } from 'react-bootstrap';

function LoadingSpinner({ message = 'Loading system configurations...' }) {
  return (
    <div className="text-center py-5">
      <Spinner animation="border" variant="primary" />
      <p className="text-muted small mt-2">{message}</p>
    </div>
  );
}

export default LoadingSpinner;

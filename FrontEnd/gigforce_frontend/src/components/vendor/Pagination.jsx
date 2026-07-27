import React from 'react';
import { Button } from 'react-bootstrap';

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <Button
        variant="outline-secondary"
        size="sm"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </Button>
      <span className="small text-muted">
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        variant="outline-secondary"
        size="sm"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
}

export default Pagination;

import React from 'react';
import { Card } from 'react-bootstrap';

function CandidateCard({ candidate, onSubmitCandidate }) {
  const getAvailabilityClass = (status) => {
    return status?.toLowerCase() === 'available' ? 'success' : 'danger';
  };

  return (
    <Card className="gf-card p-3 mb-0 border-0 h-100 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 className="fw-bold text-dark mb-0">{candidate.name}</h5>
          <span className="text-muted small">{candidate.currentCompany || 'Freelance'}</span>
        </div>
        <span className={`status-pill ${getAvailabilityClass(candidate.availability)}`}>
          {candidate.availability}
        </span>
      </div>

      <div className="small text-muted mb-3 flex-grow-1">
        <div className="mb-1 text-dark"><strong>Skills:</strong> {candidate.skills}</div>
        <div className="mb-1 text-dark"><strong>Experience:</strong> {candidate.experience} Years</div>
        <div className="mb-1 text-dark"><strong>Notice Period:</strong> {candidate.noticePeriod}</div>
        <div className="mb-1 text-dark"><strong>Preferred Location:</strong> {candidate.preferredLocation}</div>
        <div className="text-dark"><strong>Preferred Daily Rate:</strong> <span className="text-success fw-bold">₹ {candidate.rate}/day</span></div>
      </div>

      <div className="border-top pt-2">
        <button
          className="btn-enterprise-primary w-100 py-1 px-2"
          style={{ height: '32px', fontSize: '13px' }}
          disabled={!onSubmitCandidate}
          title={!onSubmitCandidate ? 'Select a requisition above to submit this candidate' : undefined}
          onClick={() => onSubmitCandidate && onSubmitCandidate(candidate)}
        >
          <i className="bi bi-send me-2"></i>
          Submit to Requisition
        </button>
      </div>
    </Card>
  );
}

export default CandidateCard;

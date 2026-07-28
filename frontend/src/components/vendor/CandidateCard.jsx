import React from 'react';
import { Card, Button } from 'react-bootstrap';

function CandidateCard({ candidate, onEdit, onDelete, onUploadResume }) {
  return (
    <Card className="gf-card p-3 mb-0 border-0 h-100 bg-white">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 className="fw-bold text-slate-800 mb-0">{candidate.name}</h5>
          <span className="text-muted small">{candidate.currentCompany || 'Freelance'}</span>
        </div>
        <span className={`gf-badge badge-${candidate.availability === 'AVAILABLE' ? 'approved' : 'rejected'}`}>
          {candidate.availability}
        </span>
      </div>

      <div className="small text-slate-600 mb-3 flex-grow-1">
        <div className="mb-1"><strong>Skills:</strong> {candidate.skills}</div>
        <div className="mb-1"><strong>Experience:</strong> {candidate.experience} Years</div>
        <div className="mb-1"><strong>Notice Period:</strong> {candidate.noticePeriod}</div>
        <div className="mb-1"><strong>Preferred Location:</strong> {candidate.preferredLocation}</div>
        <div><strong>Preferred Daily Rate:</strong> <span className="text-green-600 fw-bold">${candidate.rate}/day</span></div>
      </div>

      <div className="d-flex justify-content-between align-items-center gap-1 border-top pt-2">
        <Button size="sm" variant="outline-primary" className="py-1 px-2" onClick={() => onUploadResume(candidate)}>
          {candidate.resumeUrl ? '📄 View Resume' : '📤 Upload Resume'}
        </Button>
        <div className="d-flex gap-1">
          <Button size="sm" variant="outline-secondary" className="py-1" onClick={() => onEdit(candidate)}>
            Edit
          </Button>
          <Button size="sm" variant="outline-danger" className="py-1" onClick={() => onDelete(candidate.id)}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default CandidateCard;

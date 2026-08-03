import React from 'react';
import { Card, Button } from 'react-bootstrap';

function InterviewCard({ interview, onConfirm, onReschedule }) {
  const getBadgeType = (status) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED': return 'approved';
      case 'SCHEDULED': return 'info';
      case 'RESCHEDULE_REQUESTED': return 'pending';
      default: return 'rejected';
    }
  };

  return (
    <Card className="gf-card p-3 mb-0 border-0 h-100 bg-white">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 className="fw-bold text-slate-800 mb-0">{interview.candidateName}</h6>
          <span className="text-muted small">{interview.position}</span>
        </div>
        <span className={`gf-badge badge-${getBadgeType(interview.status)}`}>
          {interview.status}
        </span>
      </div>

      <div className="small text-slate-600 mb-3 flex-grow-1">
        <div><strong>HR:</strong> {interview.clientName}</div>
        <div><strong>Date:</strong> {interview.date}</div>
        <div><strong>Time:</strong> {interview.time}</div>
        {interview.feedback && <div className="mt-2 text-danger small"><strong>Feedback/Notes:</strong> {interview.feedback}</div>}
      </div>

      {interview.status === 'SCHEDULED' && (
        <div className="d-flex gap-2 border-top pt-2">
          <Button size="sm" className="btn-gf-primary w-50 py-1" onClick={() => onConfirm(interview.id)}>
            Confirm
          </Button>
          <Button size="sm" variant="outline-secondary" className="w-50 py-1" onClick={() => onReschedule(interview)}>
            Reschedule
          </Button>
        </div>
      )}
    </Card>
  );
}

export default InterviewCard;

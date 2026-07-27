import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Form, Modal, Row, Col } from 'react-bootstrap';
import { getInterviews, confirmInterview, requestInterviewReschedule } from '../../services/vendorInterviewService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import InterviewCard from '../../components/vendor/InterviewCard';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function Interviews() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Interviews state
  const [interviews, setInterviews] = useState([]);

  // Reschedule Modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleInt, setRescheduleInt] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getInterviews();
      setInterviews(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, []);

  const handleConfirm = async (id) => {
    try {
      setError('');
      setSuccess('');
      await confirmInterview(id);
      setSuccess('Interview confirmed successfully! Client notified.');
      loadInterviews();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openRescheduleModal = (interview) => {
    setRescheduleInt(interview);
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleReason.trim()) {
      setError('Please provide a reason or alternative slot proposals.');
      return;
    }
    try {
      setResubmitting(true);
      setError('');
      setSuccess('');
      await requestInterviewReschedule(rescheduleInt.id, rescheduleReason);
      setSuccess('Reschedule request logged. The manager will review the proposal.');
      setShowRescheduleModal(false);
      loadInterviews();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResubmitting(false);
    }
  };

  // Local Search filtering
  const filteredInterviews = interviews.filter(i => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    return (
      i.candidateName.toLowerCase().includes(q) ||
      i.clientName.toLowerCase().includes(q) ||
      i.position.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Interviews</h2>
        <p className="text-muted small mt-1 mb-0">Manage interview scheduling slots for submitted candidates and coordinate availability.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Accessing calendar slots..." />
      ) : filteredInterviews.length > 0 ? (
        <Row className="g-4">
          {filteredInterviews.map(i => (
            <Col lg={4} md={6} key={i.id}>
              <InterviewCard
                interview={i}
                onConfirm={handleConfirm}
                onReschedule={openRescheduleModal}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">📅</span>
          <p className="text-muted small mt-2 mb-0">No active interviews logged.</p>
        </div>
      )}

      {/* Reschedule Request Modal */}
      <Modal show={showRescheduleModal} onHide={() => setShowRescheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Propose Rescheduling</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {rescheduleInt && (
            <div>
              <div className="mb-3">
                <span className="text-muted text-xs">Request Reschedule for:</span>
                <h6 className="fw-bold text-slate-800">{rescheduleInt.candidateName} &bull; {rescheduleInt.clientName}</h6>
              </div>

              <Form.Group controlId="reason">
                <Form.Label className="uppercase-label">Reason / Proposed Slots</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="e.g. Candidate is unavailable on this slot. Can we reschedule to July 30th at 11 AM?"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleReschedule} disabled={resubmitting}>
            {resubmitting ? 'Submitting...' : 'Send Request'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Interviews;

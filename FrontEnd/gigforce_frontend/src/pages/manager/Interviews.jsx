import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { getInterviews, rescheduleInterview, completeInterview } from '../../services/interviewService';
import { getErrorMessage } from '../../services/errorUtils';

function Interviews() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Interviews data
  const [interviews, setInterviews] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal actions
  const [selectedInt, setSelectedInt] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '10:00 AM' });
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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

  const openReschedule = (int) => {
    setSelectedInt(int);
    setRescheduleForm({
      date: int.date,
      time: int.time,
    });
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleForm.date) {
      setError('Date is required for rescheduling.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');
      await rescheduleInterview(selectedInt.id, rescheduleForm);
      setSuccess(`Interview rescheduled successfully for ${selectedInt.candidateName}.`);
      setShowRescheduleModal(false);
      loadInterviews();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const openFeedback = (int) => {
    setSelectedInt(int);
    setFeedbackText(int.feedback || '');
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      setError('Feedback notes cannot be blank.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');
      await completeInterview(selectedInt.id, feedbackText);
      setSuccess(`Interview marked as Completed. Feedback logged.`);
      setShowFeedbackModal(false);
      loadInterviews();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Local filter
  const filteredInterviews = interviews.filter((item) => {
    // 1. Status Filter
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCandidate = item.candidateName?.toLowerCase().includes(q);
      const matchInterviewer = item.interviewer?.toLowerCase().includes(q);
      return matchCandidate || matchInterviewer;
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Interviews Calendar</h2>
          <p className="text-muted small mt-1 mb-0">Monitor scheduled candidate evaluations, log feedback notes, and adjust calendar slots.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading calendar slots...</p>
        </div>
      ) : (
        <div className="gf-card p-0 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Interview ID</th>
                  <th>Candidate</th>
                  <th>Date & Time</th>
                  <th>Interviewer</th>
                  <th>Feedback Notes</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterviews.length > 0 ? (
                  filteredInterviews.map((int) => (
                    <tr key={int.id}>
                      <td className="fw-bold">{int.id}</td>
                      <td className="fw-semibold text-slate-800">{int.candidateName}</td>
                      <td>
                        <div className="fw-semibold">{int.date}</div>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{int.time}</div>
                      </td>
                      <td>{int.interviewer}</td>
                      <td className="text-muted small" style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {int.feedback || 'Pending evaluation...'}
                      </td>
                      <td>
                        <span className={`gf-badge badge-${int.status === 'COMPLETED' ? 'approved' : 'pending'}`}>
                          {int.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          {int.status === 'SCHEDULED' && (
                            <>
                              <Button size="sm" variant="outline-primary" onClick={() => openReschedule(int)}>
                                Reschedule
                              </Button>
                              <Button size="sm" className="btn-gf-primary" onClick={() => openFeedback(int)}>
                                Complete & Feedback
                              </Button>
                            </>
                          )}
                          {int.status === 'COMPLETED' && (
                            <Button size="sm" variant="outline-secondary" onClick={() => openFeedback(int)}>
                              View Feedback
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No interviews scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal show={showRescheduleModal} onHide={() => setShowRescheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Reschedule Interview ({selectedInt?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group controlId="reschDate">
                  <Form.Label className="uppercase-label">New Interview Date</Form.Label>
                  <Form.Control 
                    type="date"
                    value={rescheduleForm.date}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="reschTime">
                  <Form.Label className="uppercase-label">New Slot Time</Form.Label>
                  <Form.Select 
                    value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, time: e.target.value }))}
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleRescheduleSubmit} disabled={submittingAction}>
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Complete & Log Feedback Modal */}
      <Modal show={showFeedbackModal} onHide={() => setShowFeedbackModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {selectedInt?.status === 'COMPLETED' ? 'View Feedback' : 'Submit Evaluation Feedback'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="evalFeedback">
            <Form.Label className="uppercase-label">Evaluation Notes / Rating Feedback</Form.Label>
            <Form.Control 
              as="textarea"
              rows={4}
              placeholder="e.g. Candidate demonstrated solid experience with Spring Security and Hibernate. Highly recommended for the role."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={selectedInt?.status === 'COMPLETED'}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFeedbackModal(false)}>Close</Button>
          {selectedInt?.status !== 'COMPLETED' && (
            <Button className="btn-gf-primary" onClick={handleFeedbackSubmit} disabled={submittingAction}>
              {submittingAction ? <Spinner animation="border" size="sm" /> : 'Log Completion'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Interviews;

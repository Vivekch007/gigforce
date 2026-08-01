import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Row, Col, Alert, Spinner, Pagination, Badge, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { getInterviews, rescheduleInterview, completeInterview } from '../../services/interviewService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';

function Interviews() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Interviews data
  const [interviews, setInterviews] = useState([]);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modal actions
  const [selectedInt, setSelectedInt] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '10:00 AM' });
  const [feedbackText, setFeedbackText] = useState('');
  const [candidateRating, setCandidateRating] = useState(5);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Today's date formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Time slots configuration
  const timeSlots = useMemo(() => [
    { label: '09:00 AM', value: '09:00 AM', hour: 9, minute: 0 },
    { label: '10:00 AM', value: '10:00 AM', hour: 10, minute: 0 },
    { label: '11:30 AM', value: '11:30 AM', hour: 11, minute: 30 },
    { label: '02:00 PM', value: '02:00 PM', hour: 14, minute: 0 },
    { label: '03:30 PM', value: '03:30 PM', hour: 15, minute: 30 },
    { label: '05:00 PM', value: '05:00 PM', hour: 17, minute: 0 },
  ], []);

  // Dynamically filter time slots for today
  const availableTimeSlots = useMemo(() => {
    if (!rescheduleForm.date) return timeSlots;

    if (rescheduleForm.date !== todayStr) {
      return timeSlots;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);

    return timeSlots.filter((slot) => {
      const slotTime = new Date();
      slotTime.setHours(slot.hour, slot.minute, 0, 0);

      return slotTime > now;
    });
  }, [rescheduleForm.date, todayStr, timeSlots]);

  // Combine YYYY-MM-DD and time string into a full JS Date object
  const parseDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);

    const slot = timeSlots.find(s => s.value === timeStr);
    let hours = slot ? slot.hour : 0;
    let minutes = slot ? slot.minute : 0;

    if (!slot) {
      const parts = timeStr.split(' ');
      if (parts.length === 2) {
        const [h, m] = parts[0].split(':').map(Number);
        const modifier = parts[1];
        hours = h;
        minutes = m;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
      }
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

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
      showToast('Date is required for rescheduling.', 'error');
      return;
    }

    if (!rescheduleForm.time) {
      showToast('Please select a valid time slot.', 'error');
      return;
    }

    const selectedDateTime = parseDateTime(
      rescheduleForm.date,
      rescheduleForm.time
    );

    const now = new Date();

    if (!selectedDateTime) {
      showToast('Invalid date or time format.', 'error');
      return;
    }

    if (selectedDateTime <= now) {
      showToast('Cannot schedule an interview for a past date or time slot.', 'error');
      return;
    }

    const validSlot = availableTimeSlots.some(
      (slot) => slot.value === rescheduleForm.time
    );

    if (!validSlot) {
      showToast('Selected time slot is no longer available.', 'error');
      return;
    }

    try {
      setSubmittingAction(true);
      setError('');
      await rescheduleInterview(selectedInt.id, rescheduleForm);
      showToast(`Interview rescheduled successfully for ${selectedInt.candidateName}.`, 'success');
      setShowRescheduleModal(false);
      loadInterviews();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const openFeedback = (int) => {
    setSelectedInt(int);
    setFeedbackText(int.feedback || '');
    setCandidateRating(int.rating || 5);
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      showToast('Feedback notes cannot be blank.', 'error');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      const payload = { feedback: feedbackText, rating: candidateRating };
      await completeInterview(selectedInt.id, payload);
      showToast('Interview marked as Completed. Feedback logged.', 'success');
      setShowFeedbackModal(false);
      loadInterviews();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Export interview to .ics calendar event file
  const exportToCalendar = (int) => {
    const startDt = parseDateTime(int.date, int.time);
    if (!startDt) {
      showToast('Could not format calendar date.', 'error');
      return;
    }
    const endDt = new Date(startDt.getTime() + 45 * 60000); // 45 minute duration

    const formatDateICS = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vendor Portal//Interview Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:Interview with ${int.candidateName}`,
      `DESCRIPTION:Interviewer: ${int.interviewer}`,
      `DTSTART:${formatDateICS(startDt)}`,
      `DTEND:${formatDateICS(endDt)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Interview_${int.candidateName.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Calendar invite (.ics) downloaded.', 'info');
  };

  // Filtered interviews list
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCandidate = item.candidateName?.toLowerCase().includes(q);
        const matchInterviewer = item.interviewer?.toLowerCase().includes(q);
        return matchCandidate || matchInterviewer;
      }
      return true;
    });
  }, [interviews, statusFilter, searchQuery]);

  // Counts for status metrics cards
  const stats = useMemo(() => {
    const total = interviews.length;
    const scheduled = interviews.filter((i) => i.status === 'SCHEDULED').length;
    const completed = interviews.filter((i) => i.status === 'COMPLETED').length;
    return { total, scheduled, completed };
  }, [interviews]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredInterviews.length / pageSize) || 1;
  const paginatedInterviews = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredInterviews.slice(start, start + pageSize);
  }, [filteredInterviews, currentPage, pageSize]);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Interviews Calendar</h2>
          <p className="text-muted small mt-1 mb-0">Monitor scheduled candidate evaluations, log feedback notes, and adjust calendar slots.</p>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card
            className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'ALL' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => { setStatusFilter('ALL'); setCurrentPage(0); }}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small uppercase fw-bold">Total Interviews</div>
                <div className="h3 fw-bold text-slate-800 mb-0">{stats.total}</div>
              </div>
              <Badge bg="secondary" pill className="fs-6">All</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card
            className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'SCHEDULED' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => { setStatusFilter('SCHEDULED'); setCurrentPage(0); }}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small uppercase fw-bold">Scheduled</div>
                <div className="h3 fw-bold text-primary mb-0">{stats.scheduled}</div>
              </div>
              <Badge bg="primary" pill className="fs-6">Upcoming</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card
            className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'COMPLETED' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => { setStatusFilter('COMPLETED'); setCurrentPage(0); }}
          >
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small uppercase fw-bold">Completed</div>
                <div className="h3 fw-bold text-success mb-0">{stats.completed}</div>
              </div>
              <Badge bg="success" pill className="fs-6">Done</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

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
                  <th>Rating & Feedback</th>
                  <th>Status</th>
                  {/* Changed text-end to text-center */}
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInterviews.length > 0 ? (
                  paginatedInterviews.map((int) => (
                    <tr key={int.id}>
                      <td className="fw-bold">{int.id}</td>
                      <td className="fw-semibold text-slate-800">{int.candidateName}</td>
                      <td>
                        <div className="fw-semibold">{int.date}</div>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{int.time}</div>
                      </td>

                      <td>
                        {int.rating && (
                          <div className="text-amber-500 fw-bold small mb-1">
                            {'★'.repeat(int.rating)}{'☆'.repeat(5 - int.rating)} ({int.rating}/5)
                          </div>
                        )}
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tt-${int.id}`}>{int.feedback || 'Pending evaluation...'}</Tooltip>}
                        >
                          <div className="text-muted small" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {int.feedback || 'Pending evaluation...'}
                          </div>
                        </OverlayTrigger>
                      </td>
                      <td>
                        <span className={`gf-badge badge-${int.status === 'COMPLETED' ? 'approved' : 'pending'}`}>
                          {int.status}
                        </span>
                      </td>
                      {/* Changed text-end to text-center and justify-content-end to justify-content-center */}
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-1">
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
                    <td colSpan={6} className="text-center py-5 text-muted">
                      No interviews found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Rows per page:</span>
              <Form.Select
                size="sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                style={{ width: '80px' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Form.Select>
              <span className="text-muted small ms-2">
                Showing {filteredInterviews.length === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, filteredInterviews.length)} of {filteredInterviews.length} entries
              </span>
            </div>

            {totalPages > 1 && (
              <Pagination className="mb-0">
                <Pagination.First onClick={() => setCurrentPage(0)} disabled={currentPage === 0} />
                <Pagination.Prev onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} />
                {[...Array(totalPages)].map((_, idx) => (
                  <Pagination.Item key={idx} active={idx === currentPage} onClick={() => setCurrentPage(idx)}>
                    {idx + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} />
                <Pagination.Last onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage === totalPages - 1} />
              </Pagination>
            )}
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
                    min={todayStr}
                    value={rescheduleForm.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      let defaultTime = '';

                      if (newDate === todayStr) {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + 5);

                        const firstAvailableSlot = timeSlots.find((slot) => {
                          const slotTime = new Date();
                          slotTime.setHours(slot.hour, slot.minute, 0, 0);
                          return slotTime > now;
                        });

                        defaultTime = firstAvailableSlot?.value || '';
                      } else {
                        defaultTime = timeSlots[0]?.value || '';
                      }

                      setRescheduleForm({
                        date: newDate,
                        time: defaultTime,
                      });
                    }}
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
                    <option value="">Select Time Slot</option>
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No available slots remaining for today
                      </option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleRescheduleSubmit} disabled={submittingAction || !rescheduleForm.time || availableTimeSlots.length === 0}>
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
          <Form onSubmit={(e) => e.preventDefault()}>
            <Form.Group controlId="evalRating" className="mb-3">
              <Form.Label className="uppercase-label">Candidate Score Rating</Form.Label>
              <Form.Select
                value={candidateRating}
                onChange={(e) => setCandidateRating(Number(e.target.value))}
                disabled={selectedInt?.status === 'COMPLETED'}
              >
                <option value={5}>5 - Excellent Fit</option>
                <option value={4}>4 - Good Candidate</option>
                <option value={3}>3 - Average / Needs Consideration</option>
                <option value={2}>2 - Marginal</option>
                <option value={1}>1 - Not Qualified</option>
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="evalFeedback">
              <Form.Label className="uppercase-label">Evaluation Notes / Detailed Feedback</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="e.g. Candidate demonstrated solid experience with Spring Security and Hibernate. Highly recommended for the role."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                disabled={selectedInt?.status === 'COMPLETED'}
              />
            </Form.Group>
          </Form>
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
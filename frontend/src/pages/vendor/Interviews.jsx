import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Form, Modal, Row, Col } from 'react-bootstrap';
import { getInterviews, confirmInterview, requestInterviewReschedule } from '../../services/vendorInterviewService';
import { getRequisitions } from '../../services/vendorRequisitionService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import InterviewCard from '../../components/vendor/InterviewCard';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';
import Pagination from '../../components/vendor/Pagination';
import VendorFilters from '../../components/vendor/VendorFilters';

function Interviews() {
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination & Data
  const [interviews, setInterviews] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [reqFilter, setReqFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [openReqs, setOpenReqs] = useState([]);

  // Reschedule Modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleInt, setRescheduleInt] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  const loadRequisitions = async () => {
    try {
      const res = await getRequisitions({ size: 100 });
      setOpenReqs(res?.content || []);
    } catch (err) {
      console.error("Failed to load requisitions", err);
    }
  };

  const loadInterviews = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        size: 10,
        requisitionId: reqFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      };
      const data = await getInterviews(params);
      setInterviews(data?.content || []);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [page, reqFilter, statusFilter, startDateFilter, endDateFilter]);

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

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Interviews</h2>
        <p className="text-muted small mt-1 mb-0">Manage interview scheduling slots for submitted candidates and coordinate availability.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Filter Row */}
      <div className="enterprise-table-container p-3 mb-4 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <div>
            <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>Requisition</Form.Label>
            <Form.Select size="sm" value={reqFilter} onChange={e => setReqFilter(e.target.value)}>
              <option value="">All Requisitions</option>
              {openReqs.map(req => (
                <option key={req.id} value={req.id}>{req.title || req.jobTitle}</option>
              ))}
            </Form.Select>
          </div>
          <VendorFilters
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'RESCHEDULED', label: 'Rescheduled' },
            ]}
          />
          <div>
            <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>Start Date</Form.Label>
            <Form.Control type="date" size="sm" value={startDateFilter} onChange={e => setStartDateFilter(e.target.value)} />
          </div>
          <div>
            <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>End Date</Form.Label>
            <Form.Control type="date" size="sm" value={endDateFilter} onChange={e => setEndDateFilter(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Accessing calendar slots..." />
      ) : interviews.length > 0 ? (
        <>
          <Row className="g-4 mb-4">
            {interviews.map(i => (
              <Col lg={4} md={6} key={i.id}>
                <InterviewCard
                  interview={i}
                  onConfirm={handleConfirm}
                  onReschedule={openRescheduleModal}
                />
              </Col>
            ))}
          </Row>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <div className="mb-3 text-muted">
            <i className="bi bi-calendar-event" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <p className="text-muted small mb-0">No active interviews logged for the selected criteria.</p>
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

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { getLeavesToApprove, approveLeave, rejectLeave, getLeaveDetails } from '../../services/approvalService';
import { getErrorMessage } from '../../services/errorUtils';
import Table from '../../components/Table';
import Loader from '../../components/Loader';
import KpiCard from '../../components/KpiCard';

function LeaveApprovals() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Leaves logs
  const [leaves, setLeaves] = useState([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState('PENDING'); // default filter

  // Summary indicators
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    today: 0,
  });

  // Modal actions
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const diffTime = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const loadLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      const data = await getLeavesToApprove(params);
      setLeaves(data || []);
      
      // Calculate Summary stats from list
      let pendCount = 0;
      let appCount = 0;
      let rejCount = 0;
      let todayCount = 0;
      
      const todayStr = new Date().toISOString().split('T')[0];

      data.forEach((item) => {
        if (item.status === 'PENDING') pendCount++;
        else if (item.status === 'APPROVED') appCount++;
        else if (item.status === 'REJECTED') rejCount++;

        // If request was submitted/created today
        if (item.createdDate && item.createdDate.startsWith(todayStr)) {
          todayCount++;
        }
      });

      setSummary({
        pending: pendCount,
        approved: appCount,
        rejected: rejCount,
        today: todayCount,
      });

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleApprove = async (id) => {
    try {
      setError('');
      setSuccess('');
      await approveLeave(id);
      setSuccess(`Leave request ${id} approved successfully!`);
      loadLeaves();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openRejectModal = (leave) => {
    setSelectedLeave(leave);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setError('A rejection reason/comment is mandatory.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      await rejectLeave(selectedLeave.id, rejectReason);
      setSuccess(`Leave request ${selectedLeave.id} rejected with feedback.`);
      setShowRejectModal(false);
      loadLeaves();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const openDetails = async (leave) => {
    try {
      setSelectedLeave(leave);
      setShowViewModal(true);
      const details = await getLeaveDetails(leave.id);
      setSelectedLeave(details);
    } catch (err) {
      console.error('Failed to load leave details', err);
    }
  };

  // Local filter
  const filteredLeaves = leaves.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        (item.contractorName && item.contractorName.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">Leave Approvals</h1>
        <p className="muted-text">Review leave requests, verify balance constraints, and sign off on contractor absences.</p>
      </div>

      {/* Leave Summary Tab Bar */}
      <div 
        className="d-flex border-bottom mb-4" 
        style={{ borderColor: 'var(--gf-border)' }}
      >
        <button
          onClick={() => setStatusFilter('ALL')}
          className="pb-3 px-3 bg-transparent border-0 position-relative small"
          style={{
            fontWeight: statusFilter === 'ALL' ? '600' : '500',
            color: statusFilter === 'ALL' ? 'var(--gf-primary)' : 'var(--gf-muted)',
            transition: 'all 0.2s ease',
            outline: 'none',
            fontSize: '14px'
          }}
        >
          All ({leaves.length})
          {statusFilter === 'ALL' && (
            <div 
              style={{
                position: 'absolute',
                bottom: '-1px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: 'var(--gf-primary)'
              }}
            />
          )}
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className="pb-3 px-3 bg-transparent border-0 position-relative small"
          style={{
            fontWeight: statusFilter === 'PENDING' ? '600' : '500',
            color: statusFilter === 'PENDING' ? 'var(--gf-primary)' : 'var(--gf-muted)',
            transition: 'all 0.2s ease',
            outline: 'none',
            fontSize: '14px'
          }}
        >
          Pending ({summary.pending})
          {statusFilter === 'PENDING' && (
            <div 
              style={{
                position: 'absolute',
                bottom: '-1px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: 'var(--gf-primary)'
              }}
            />
          )}
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className="pb-3 px-3 bg-transparent border-0 position-relative small"
          style={{
            fontWeight: statusFilter === 'APPROVED' ? '600' : '500',
            color: statusFilter === 'APPROVED' ? 'var(--gf-primary)' : 'var(--gf-muted)',
            transition: 'all 0.2s ease',
            outline: 'none',
            fontSize: '14px'
          }}
        >
          Approved ({summary.approved})
          {statusFilter === 'APPROVED' && (
            <div 
              style={{
                position: 'absolute',
                bottom: '-1px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: 'var(--gf-primary)'
              }}
            />
          )}
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className="pb-3 px-3 bg-transparent border-0 position-relative small"
          style={{
            fontWeight: statusFilter === 'REJECTED' ? '600' : '500',
            color: statusFilter === 'REJECTED' ? 'var(--gf-primary)' : 'var(--gf-muted)',
            transition: 'all 0.2s ease',
            outline: 'none',
            fontSize: '14px'
          }}
        >
          Rejected ({summary.rejected})
          {statusFilter === 'REJECTED' && (
            <div 
              style={{
                position: 'absolute',
                bottom: '-1px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: 'var(--gf-primary)'
              }}
            />
          )}
        </button>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="enterprise-alert enterprise-alert-success mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <Loader message="Loading leave logs..." />
      ) : (
        <div>
          {filteredLeaves.length > 0 ? (
            <Table headers={['Request ID', 'Contractor', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Actions']}>
              {filteredLeaves.map((item) => (
                <tr key={item.id}>
                  <td className="fw-bold">{item.id}</td>
                  <td className="fw-semibold text-dark">{item.contractorName || 'Contractor'}</td>
                  <td>
                    <span className="fw-semibold">{item.absenceType}</span>
                    <div className="text-muted small" style={{ fontSize: '11px' }}>{item.duration} Day</div>
                  </td>
                  <td>{item.startDate}</td>
                  <td>{item.endDate}</td>
                  <td className="fw-semibold">{calculateDays(item.startDate, item.endDate)}</td>
                  <td>
                    <span className={`status-pill ${item.status.toLowerCase() === 'approved' ? 'success' : item.status.toLowerCase() === 'pending' ? 'pending' : 'danger'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2 justify-content-start">
                      <button className="btn-enterprise-secondary py-1 px-3" onClick={() => openDetails(item)}>
                        View
                      </button>
                      
                      {item.status === 'PENDING' && (
                        <>
                          <button className="btn-enterprise-primary py-1 px-3" onClick={() => handleApprove(item.id)}>
                            Approve
                          </button>
                          <button className="btn-enterprise-ghost text-danger py-1 px-3 border-0" onClick={() => openRejectModal(item)}>
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="enterprise-table-container p-5 text-center text-muted">
              <i className="bi bi-calendar-x fs-2"></i>
              <p className="small mt-2 mb-0">No leave requests found in this status filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Details View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Leave Absence Details ({selectedLeave?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {selectedLeave ? (
            <Row className="g-3">
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Contractor</div>
                <div className="fw-bold text-dark">{selectedLeave.contractorName || 'Sarah Contractor'}</div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Status</div>
                <div className="mt-1">
                  <span className={`status-pill ${selectedLeave.status.toLowerCase() === 'approved' ? 'success' : selectedLeave.status.toLowerCase() === 'pending' ? 'pending' : 'danger'}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Leave Type</div>
                <div className="fw-semibold text-dark">{selectedLeave.absenceType} &bull; {selectedLeave.duration}</div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Duration Period</div>
                <div className="fw-semibold text-dark">{selectedLeave.startDate} to {selectedLeave.endDate}</div>
              </Col>
              <Col sm={12}>
                <hr />
                <div className="small text-muted font-bold text-uppercase mb-2" style={{ fontSize: '10px' }}>Absence Reason</div>
                <p className="bg-light p-3 rounded text-dark small">{selectedLeave.reason || 'No description provided.'}</p>
              </Col>
              {selectedLeave.remarks && (
                <Col sm={12}>
                  <div className="small text-muted font-bold text-uppercase mb-2" style={{ fontSize: '10px' }}>Manager Review Remarks</div>
                  <p className="bg-light p-3 rounded text-danger small fw-semibold">{selectedLeave.remarks}</p>
                </Col>
              )}
            </Row>
          ) : (
            <div className="text-center py-4"><Spinner animation="border" variant="primary" size="sm" /></div>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowViewModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal with mandatory reason */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          <Form.Group controlId="rejectReasonComments">
            <Form.Label className="enterprise-form-label">Rejection Reason (Mandatory) *</Form.Label>
            <Form.Control 
              as="textarea"
              rows={3}
              placeholder="e.g. Schedule conflicts on these dates. Please coordinate shift cover."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="enterprise-form-control"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
          <button 
            className="btn-enterprise-primary bg-danger border-danger" 
            onClick={handleRejectSubmit} 
            disabled={submittingAction}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Confirm Rejection'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default LeaveApprovals;

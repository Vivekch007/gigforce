import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { getLeavesToApprove, approveLeave, rejectLeave, getLeaveDetails } from '../../services/approvalService';
import { getErrorMessage } from '../../services/errorUtils';

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
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Leave Approvals</h2>
          <p className="text-muted small mt-1 mb-0">Review leave requests, verify balance constraints, and sign off on absences.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="gf-card mb-0 p-3 h-100 bg-white border-start border-4 border-warning">
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending Requests</span>
            <h3 className="fw-black text-amber-600 mt-1 mb-0">{summary.pending}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="gf-card mb-0 p-3 h-100 bg-white border-start border-4 border-success">
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Approved</span>
            <h3 className="fw-black text-green-600 mt-1 mb-0">{summary.approved}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="gf-card mb-0 p-3 h-100 bg-white border-start border-4 border-danger">
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Rejected</span>
            <h3 className="fw-black text-red-600 mt-1 mb-0">{summary.rejected}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="gf-card mb-0 p-3 h-100 bg-white border-start border-4 border-primary">
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Submitted Today</span>
            <h3 className="fw-black text-blue-600 mt-1 mb-0">{summary.today}</h3>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading leave logs...</p>
        </div>
      ) : (
        <div className="gf-card p-0 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Request ID</th>
                  <th>Contractor</th>
                  <th>Leave Type</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length > 0 ? (
                  filteredLeaves.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold">{item.id}</td>
                      <td className="fw-semibold text-slate-800">{item.contractorName || 'Contractor'}</td>
                      <td>
                        <span className="fw-semibold">{item.absenceType}</span>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{item.duration} Day</div>
                      </td>
                      <td>{item.startDate}</td>
                      <td>{item.endDate}</td>
                      <td className="fw-semibold">{calculateDays(item.startDate, item.endDate)}</td>
                      <td>
                        <span className={`gf-badge badge-${item.status.toLowerCase() === 'approved' ? 'approved' : item.status.toLowerCase() === 'pending' ? 'pending' : 'rejected'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button size="sm" variant="outline-primary" onClick={() => openDetails(item)}>
                            View
                          </Button>
                          
                          {item.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline-success" onClick={() => handleApprove(item.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => openRejectModal(item)}>
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted">
                      No leave requests found in this status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Leave Absence Details ({selectedLeave?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLeave ? (
            <Row className="g-3">
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase">Contractor</div>
                <div className="fw-bold text-slate-800">{selectedLeave.contractorName || 'Sarah Contractor'}</div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase">Status</div>
                <div className="mt-1">
                  <span className={`gf-badge badge-${selectedLeave.status.toLowerCase() === 'approved' ? 'approved' : selectedLeave.status.toLowerCase() === 'pending' ? 'pending' : 'rejected'}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase">Leave Type</div>
                <div className="fw-semibold text-slate-800">{selectedLeave.absenceType} &bull; {selectedLeave.duration}</div>
              </Col>
              <Col sm={6}>
                <div className="small text-muted font-bold text-uppercase">Duration Period</div>
                <div className="fw-semibold text-slate-800">{selectedLeave.startDate} to {selectedLeave.endDate}</div>
              </Col>
              <Col sm={12}>
                <hr />
                <div className="small text-muted font-bold text-uppercase mb-2">Absence Reason</div>
                <p className="bg-light p-3 rounded text-slate-700">{selectedLeave.reason || 'No description provided.'}</p>
              </Col>
              {selectedLeave.remarks && (
                <Col sm={12}>
                  <div className="small text-muted font-bold text-uppercase mb-2">Manager Review Remarks</div>
                  <p className="bg-light p-3 rounded text-danger fw-semibold">{selectedLeave.remarks}</p>
                </Col>
              )}
            </Row>
          ) : (
            <div className="text-center"><Spinner animation="border" /></div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal with mandatory reason */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Reject Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="rejectReasonComments">
            <Form.Label className="uppercase-label">Rejection Reason (Mandatory) *</Form.Label>
            <Form.Control 
              as="textarea"
              rows={3}
              placeholder="e.g. Schedule conflicts on these dates. Please coordinate shift cover."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
          <Button 
            variant="danger" 
            onClick={handleRejectSubmit} 
            disabled={submittingAction}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Confirm Rejection'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default LeaveApprovals;

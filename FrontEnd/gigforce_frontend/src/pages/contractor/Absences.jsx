import React, { useEffect, useState } from 'react';
import { Spinner, Alert, Button, Card, Table, Modal, Form, Row, Col } from 'react-bootstrap';
import { getAbsences, requestAbsence } from '../../services/contractorService';
import { getAssignments } from '../../services/assignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import '../../styles/contractor.css';

function Absences() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [absences, setAbsences] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    assignmentId: '',
    startDate: '',
    endDate: '',
    absenceType: 'CASUAL_LEAVE',
    duration: 'FULL_DAY',
    reason: '',
  });

  const loadData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError('');

      // Fetch absences list
      const absencesData = await getAbsences();
      setAbsences(absencesData || []);

      // Fetch assignments for drop-down selection
      const assignmentsData = await getAssignments();
      const list = assignmentsData.content || [];
      setAssignments(list);

      if (list.length > 0 && !form.assignmentId) {
        setForm((prev) => ({ ...prev, assignmentId: list[0].id }));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!form.assignmentId) {
      alert('Please select an active assignment placement.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await requestAbsence(form);
      setShowModal(false);
      setForm({
        assignmentId: assignments[0]?.id || '',
        startDate: '',
        endDate: '',
        absenceType: 'CASUAL_LEAVE',
        duration: 'FULL_DAY',
        reason: '',
      });
      alert('Leave request submitted successfully!');
      loadData(false); // Refresh silently
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Filter list locally
  const filteredAbsences = absences.filter((ab) => {
    if (statusFilter === 'ALL') return true;
    return ab.status === statusFilter;
  });

  // Calculate metrics based on list
  const approvedCasual = absences
    .filter((a) => a.status === 'APPROVED' && a.absenceType === 'CASUAL_LEAVE')
    .reduce((acc, current) => acc + (current.duration === 'HALF_DAY' ? 0.5 : 1), 0);

  const approvedSick = absences
    .filter((a) => a.status === 'APPROVED' && a.absenceType === 'SICK_LEAVE')
    .reduce((acc, current) => acc + (current.duration === 'HALF_DAY' ? 0.5 : 1), 0);

  const pendingRequestsCount = absences.filter((a) => a.status === 'PENDING').length;
  const approvedRequestsCount = absences.filter((a) => a.status === 'APPROVED').length;

  const casualBalance = Math.max(0, 15 - approvedCasual);
  const sickBalance = Math.max(0, 10 - approvedSick);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading absences portal...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Leave & Absences</h2>
          <p className="text-muted small mt-1 mb-0">Apply for time off and review approval workflows.</p>
        </div>
        <Button className="btn-gf-primary px-4 py-2" onClick={() => setShowModal(true)}>
          Apply Leave
        </Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Casual Leave Balance</span>
              <h3 className="fw-black text-slate-800 mt-1 mb-0">{casualBalance} / 15</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Days remaining this year</p>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Sick Leave Balance</span>
              <h3 className="fw-black text-slate-800 mt-1 mb-0">{sickBalance} / 10</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Medical days remaining</p>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending Approval</span>
              <h3 className="fw-black text-amber-600 mt-1 mb-0">{pendingRequestsCount}</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Requests awaiting review</p>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Approved Placements</span>
              <h3 className="fw-black text-green-600 mt-1 mb-0">{approvedRequestsCount}</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Days approved by managers</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-3 overflow-x-auto pb-1">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? 'primary' : 'outline-secondary'}
            size="sm"
            onClick={() => setStatusFilter(filter)}
            className={statusFilter === filter ? 'btn-gf-primary' : 'btn-gf-outline border-secondary text-secondary'}
          >
            {filter.charAt(0) + filter.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Absences Log Grid */}
      <div className="gf-card p-0 overflow-hidden">
        {filteredAbsences.length > 0 ? (
          <Table responsive hover className="align-middle text-sm mb-0">
            <thead className="bg-light">
              <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: '0.75rem' }}>
                <th className="p-3">Type</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Start Date</th>
                <th className="p-3">End Date</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAbsences.map((ab) => (
                <tr key={ab.id}>
                  <td className="p-3 fw-bold text-slate-800">{ab.absenceType.replace('_', ' ')}</td>
                  <td className="p-3">{ab.duration.replace('_', ' ')}</td>
                  <td className="p-3">{ab.startDate}</td>
                  <td className="p-3">{ab.endDate}</td>
                  <td className="p-3 text-muted text-truncate" style={{ maxWidth: '250px' }}>{ab.reason}</td>
                  <td className="p-3">
                    <span className={`gf-badge badge-${ab.status.toLowerCase()}`}>
                      {ab.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center py-5">
            <span className="fs-1">🌴</span>
            <p className="text-muted small mt-2 mb-0">No leave logs match the current filter.</p>
          </div>
        )}
      </div>

      {/* Apply Leave Request Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Apply for Leave</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleApplyLeave}>
          <Modal.Body>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Group controlId="leaveAssignment">
                  <Form.Label className="uppercase-label">Assignment Placement</Form.Label>
                  <Form.Select 
                    value={form.assignmentId} 
                    onChange={(e) => setForm({...form, assignmentId: e.target.value})}
                    required
                  >
                    <option value="">Select placement...</option>
                    {assignments.map((asn) => (
                      <option key={asn.id} value={asn.id}>
                        {asn.requisitionTitle || 'Placement'} ({asn.id})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveStart">
                  <Form.Label className="uppercase-label">Start Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={form.startDate} 
                    onChange={(e) => setForm({...form, startDate: e.target.value})}
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveEnd">
                  <Form.Label className="uppercase-label">End Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={form.endDate} 
                    onChange={(e) => setForm({...form, endDate: e.target.value})}
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveType">
                  <Form.Label className="uppercase-label">Leave Type</Form.Label>
                  <Form.Select 
                    value={form.absenceType} 
                    onChange={(e) => setForm({...form, absenceType: e.target.value})}
                  >
                    <option value="CASUAL_LEAVE">Casual Leave</option>
                    <option value="SICK_LEAVE">Sick Leave</option>
                    <option value="EMERGENCY_LEAVE">Emergency Leave</option>
                    <option value="UNPAID_LEAVE">Unpaid Leave</option>
                    <option value="OTHER">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveDuration">
                  <Form.Label className="uppercase-label">Duration Basis</Form.Label>
                  <Form.Select 
                    value={form.duration} 
                    onChange={(e) => setForm({...form, duration: e.target.value})}
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="HALF_DAY">Half Day</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12} className="mb-3">
                <Form.Group controlId="leaveReason">
                  <Form.Label className="uppercase-label">Reason</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={form.reason} 
                    onChange={(e) => setForm({...form, reason: e.target.value})} 
                    placeholder="Provide details / description for manager review..."
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-gf-primary" disabled={actionLoading}>
              {actionLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default Absences;

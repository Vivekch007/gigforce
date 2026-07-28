import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Alert, Spinner } from 'react-bootstrap';
import { getTimesheetsToApprove, getTimesheetDetails, approveTimesheet, rejectTimesheet } from '../../services/approvalService';
import { getErrorMessage } from '../../services/errorUtils';

function TimesheetApprovals() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Timesheets lists
  const [timesheets, setTimesheets] = useState([]);

  // Filter
  const [statusFilter, setStatusFilter] = useState('SUBMITTED'); // Default show submitted first

  // Modals
  const [selectedTs, setSelectedTs] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  
  const [actionType, setActionType] = useState('APPROVE'); // APPROVE or REJECT
  const [remarksText, setRemarksText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      
      const data = await getTimesheetsToApprove(params);
      setTimesheets(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimesheets();
  }, [statusFilter]);

  const viewDetails = async (ts) => {
    try {
      setSelectedTs(ts);
      setShowViewModal(true);
      const details = await getTimesheetDetails(ts.id);
      setSelectedTs(details);
    } catch (err) {
      console.error('Failed to load timesheet details', err);
    }
  };

  const openActionModal = (ts, type) => {
    setSelectedTs(ts);
    setActionType(type);
    setRemarksText('');
    setShowActionModal(true);
  };

  const handleActionSubmit = async () => {
    if (actionType === 'REJECT' && !remarksText.trim()) {
      setError('A rejection reason/comment is mandatory.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      if (actionType === 'APPROVE') {
        await approveTimesheet(selectedTs.id, remarksText);
        setSuccess(`Timesheet ${selectedTs.id} approved successfully!`);
      } else {
        await rejectTimesheet(selectedTs.id, remarksText);
        setSuccess(`Timesheet ${selectedTs.id} rejected and returned to contractor.`);
      }

      setShowActionModal(false);
      loadTimesheets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Local filter
  const filteredTimesheets = timesheets.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (item.contractorName && item.contractorName.toLowerCase().includes(q)) ||
      (item.assignmentId && item.assignmentId.toLowerCase().includes(q)) ||
      item.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Timesheet Approvals</h2>
          <p className="text-muted small mt-1 mb-0">Sign off on contractor weekly log sheets or return them for edits.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading submitted logs...</p>
        </div>
      ) : (
        <div className="gf-card p-0 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timesheet ID</th>
                  <th>Contractor</th>
                  <th>Week Period</th>
                  <th>Regular Hours</th>
                  <th>Overtime</th>
                  <th>Billable Cost</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets.length > 0 ? (
                  filteredTimesheets.map((ts) => (
                    <tr key={ts.id}>
                      <td className="fw-bold">{ts.id}</td>
                      <td className="fw-semibold text-slate-800">{ts.contractorName || 'Contractor'}</td>
                      <td className="small">
                        <span className="fw-medium">{ts.startDate}</span> to <span className="fw-medium">{ts.endDate}</span>
                      </td>
                      <td className="fw-semibold">{ts.totalHoursLogged || 0.00} hrs</td>
                      <td>{ts.totalOvertimeHoursLogged || 0.00} hrs</td>
                      <td className="text-green-600 fw-bold">${parseFloat(ts.billableAmount || '0').toLocaleString()}</td>
                      <td>
                        <span className={`gf-badge badge-${ts.status.toLowerCase() === 'approved' ? 'approved' : ts.status.toLowerCase() === 'submitted' ? 'pending' : 'rejected'}`}>
                          {ts.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button size="sm" variant="outline-primary" onClick={() => viewDetails(ts)}>
                            View Logs
                          </Button>
                          
                          {ts.status === 'SUBMITTED' && (
                            <>
                              <Button size="sm" variant="outline-success" onClick={() => openActionModal(ts, 'APPROVE')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => openActionModal(ts, 'REJECT')}>
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
                      No timesheets found in this status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Daily Breakdown Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Weekly Log Breakdown ({selectedTs?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTs ? (
            <div>
              <div className="bg-light p-3 rounded mb-3">
                <div className="row g-2">
                  <Col sm={6}>
                    <div className="small text-muted text-uppercase font-bold">Contractor</div>
                    <div className="fw-bold text-slate-800">{selectedTs.contractorName}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted text-uppercase font-bold">Assignment Reference</div>
                    <div className="fw-semibold text-slate-800">{selectedTs.assignmentId}</div>
                  </Col>
                </div>
              </div>

              <h6 className="fw-bold text-slate-700 mb-2">Daily Entries</h6>
              <div className="table-responsive">
                <Table className="table table-bordered table-sm align-middle text-center">
                  <thead className="table-light">
                    <tr>
                      <th>Day</th>
                      <th>Work Date</th>
                      <th>Hours Worked</th>
                      <th>Overtime Hours</th>
                      <th>Activity Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTs.lines && selectedTs.lines.length > 0 ? (
                      selectedTs.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="fw-semibold">{line.dayOfWeek}</td>
                          <td>{line.workDate}</td>
                          <td className="fw-bold text-slate-800">{line.hoursWorked}</td>
                          <td>{line.overtimeHours}</td>
                          <td className="text-start small text-slate-600">{line.activityDescription || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-muted">No daily records logged.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {selectedTs.comments && selectedTs.comments.length > 0 && (
                <div className="mt-3">
                  <h6 className="fw-bold text-slate-700">Workflow Comments Thread</h6>
                  <div className="d-flex flex-column gap-2 bg-light p-3 rounded">
                    {selectedTs.comments.map((comment) => (
                      <div key={comment.id} className="small border-bottom pb-2">
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold text-slate-700">{comment.authorName} ({comment.authorRole})</span>
                          <span className="text-muted text-xs">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="mb-0 text-slate-600 mt-1">{comment.remarks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* Action Modal (Approve or Reject with comments) */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {actionType === 'APPROVE' ? 'Approve Timesheet' : 'Reject Timesheet'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="approvalComments">
            <Form.Label className="uppercase-label">
              {actionType === 'APPROVE' ? 'Remarks (Optional)' : 'Rejection Reason (Mandatory) *'}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={actionType === 'APPROVE' ? 'Add signing remarks...' : 'Provide details on what needs correction...'}
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
              required={actionType === 'REJECT'}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowActionModal(false)}>Cancel</Button>
          <Button
            variant={actionType === 'APPROVE' ? 'success' : 'danger'}
            onClick={handleActionSubmit}
            disabled={submittingAction}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : actionType === 'APPROVE' ? 'Approve Logs' : 'Reject Logs'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TimesheetApprovals;

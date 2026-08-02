import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Modal, Alert, Spinner, Col } from 'react-bootstrap';
import { getTimesheetDetails, approveTimesheet, rejectTimesheet } from '../../services/approvalService';
import { getAssignments } from '../../services/managerAssignmentService';
import { createTimesheet, getTimesheets } from '../../services/timesheetService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function TimesheetApprovals() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Week selection state (Monday start)
  const getMondayDateStr = (dateInput) => {
    const date = new Date(dateInput);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getMondayDateStr(new Date()));

  // Active assignments and timesheets for current week
  const [assignments, setAssignments] = useState([]);
  const [timesheets, setTimesheets] = useState([]);

  // Modals
  const [selectedTs, setSelectedTs] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const [actionType, setActionType] = useState('APPROVE'); // APPROVE or REJECT
  const [remarksText, setRemarksText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Date range utility
  const formatWeekRange = (mondayStr) => {
    if (!mondayStr) return '';
    const [y, m, d] = mondayStr.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.toLocaleDateString('en-US', { day: 'numeric' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.toLocaleDateString('en-US', { day: 'numeric' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch active assignments
      const assignmentsData = await getAssignments({ status: 'ACTIVE', size: 100 });
      const activeAsns = (assignmentsData?.content || []).filter(
        (asn) => asn.hiringManagerEmail === user?.email
      );
      setAssignments(activeAsns);

      // 2. Fetch all timesheets for selected week
      const timesheetsData = await getTimesheets({ weekStartDate: selectedWeekStart });
      setTimesheets(timesheetsData || []);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedWeekStart]);

  // Map assignments to their timesheets
  const mappedRows = useMemo(() => {
    return assignments.map((asn) => {
      const existingTs = timesheets.find((ts) => ts.assignmentId === asn.id);
      return {
        id: asn.id,
        contractorName: asn.contractorName,
        assignmentTitle: asn.requisitionTitle || 'Specialist',
        status: existingTs ? existingTs.status : 'NOT_CREATED',
        timesheetId: existingTs ? existingTs.id : null,
        existingTs: existingTs,
      };
    });
  }, [assignments, timesheets]);

  // Local Search filtering
  const filteredRows = useMemo(() => {
    return mappedRows.filter((row) => {
      const q = searchQuery.trim().toLowerCase();
      return (
        !q ||
        row.contractorName.toLowerCase().includes(q) ||
        row.assignmentTitle.toLowerCase().includes(q) ||
        (row.timesheetId && row.timesheetId.toLowerCase().includes(q))
      );
    });
  }, [mappedRows, searchQuery]);

  // Simplified statistics
  const stats = useMemo(() => {
    const generated = timesheets.length;
    const submitted = timesheets.filter((ts) => ts.status === 'SUBMITTED').length;
    const approved = timesheets.filter((ts) => ts.status === 'APPROVED').length;
    return { generated, submitted, approved };
  }, [timesheets]);

  // Batch Generation Logic
  const handleGenerateTimesheets = async () => {
    const pendingGeneration = mappedRows.filter((r) => r.status === 'NOT_CREATED');

    if (pendingGeneration.length === 0) {
      showToast('All active assignments already have timesheets generated for this week.', 'info');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const promises = pendingGeneration.map((row) =>
        createTimesheet({ assignmentId: row.id, weekStartDate: selectedWeekStart })
      );

      await Promise.all(promises);

      showToast(
        `${pendingGeneration.length} timesheets generated successfully for ${formatWeekRange(selectedWeekStart)}.`,
        'success'
      );
      loadDashboardData();
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const viewDetails = async (tsId) => {
    try {
      setDetailsError('');
      setLoadingDetails(true);
      setShowViewModal(true);

      const details = await getTimesheetDetails(tsId);
      setSelectedTs(details);
    } catch (err) {
      setDetailsError(getErrorMessage(err));
    } finally {
      setLoadingDetails(false);
    }
  };

  const openActionModal = (ts, type) => {
    setSelectedTs(ts);
    setActionType(type);
    setRemarksText('');
    setShowActionModal(true);
  };

  const handleActionSubmit = async (typeParam) => {
    const finalType = typeParam || actionType;
    if (finalType === 'REJECT' && !remarksText.trim()) {
      showToast('A rejection reason/comment is mandatory.', 'error');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');

      if (finalType === 'APPROVE') {
        await approveTimesheet(selectedTs.id, remarksText);
        showToast(`Timesheet approved successfully.`, 'success');
      } else {
        await rejectTimesheet(selectedTs.id, remarksText);
        showToast(`Timesheet rejected and returned to contractor.`, 'success');
      }

      setShowActionModal(false);
      loadDashboardData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="page-title mb-1">Weekly Timesheets</h1>
          <p className="muted-text mb-0">Generate weekly drafts for active assignments and sign off on contractor logs.</p>
        </div>

        {/* Date Selector & Action Trigger */}
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Form.Control
            type="date"
            value={selectedWeekStart}
            onChange={(e) => setSelectedWeekStart(getMondayDateStr(e.target.value))}
            className="enterprise-form-control"
            style={{ width: '220px' }}
          />

          <button
            type="button"
            className="btn-enterprise-primary px-4"
            onClick={handleGenerateTimesheets}
            disabled={generating || loading}
          >
            {generating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Generating...
              </>
            ) : (
              'Generate This Week\'s Timesheets'
            )}
          </button>
        </div>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {/* Simplified Statistics Banner */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="gf-card p-3 mb-0 text-center" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>Week Period</span>
            <h5 className="fw-black text-slate-800 mt-2 mb-0">{formatWeekRange(selectedWeekStart)}</h5>
          </div>
        </div>
        <div className="col-md-4 col-sm-6">
          <div className="gf-card p-3 mb-0 text-center" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>Generated</span>
            <h4 className="fw-black text-slate-800 mt-1 mb-0">{stats.generated}</h4>
          </div>
        </div>
        <div className="col-md-4 col-sm-6">
          <div className="gf-card p-3 mb-0 text-center" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
            <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.7rem' }}>Submitted / Approved</span>
            <h4 className="fw-black text-slate-800 mt-1 mb-0">
              <span className="text-primary">{stats.submitted}</span> <span className="text-muted">/</span> <span className="text-success">{stats.approved}</span>
            </h4>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading weekly logs..." />
      ) : (
        <div>
          {filteredRows.length > 0 ? (
            <Table headers={['Contractor', 'Assignment', 'Week', 'Status', 'Action']}>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="fw-semibold text-dark">{row.contractorName}</td>
                  <td>{row.assignmentTitle}</td>
                  <td className="small">{formatWeekRange(selectedWeekStart)}</td>
                  <td>
                    <span className={`status-pill ${
                      row.status.toLowerCase() === 'approved' ? 'success' :
                      row.status.toLowerCase() === 'submitted' ? 'pending' :
                      row.status.toLowerCase() === 'rejected' ? 'danger' :
                      row.status.toLowerCase() === 'draft' ? 'warning' : 'secondary'
                    }`}>
                      {row.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {row.status === 'NOT_CREATED' ? (
                      <span className="text-muted">—</span>
                    ) : row.status === 'SUBMITTED' ? (
                      <button
                        type="button"
                        className="btn-enterprise-primary py-1 px-3"
                        onClick={() => openActionModal(row.existingTs, 'APPROVE')}
                      >
                        Review
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-enterprise-secondary py-1 px-3"
                        onClick={() => viewDetails(row.timesheetId)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="enterprise-table-container p-5 text-center text-muted" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
              <i className="bi bi-clock fs-2"></i>
              <p className="small mt-2 mb-0">No contractors or assignments found for this week.</p>
            </div>
          )}
        </div>
      )}

      {/* Daily Breakdown Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Weekly Log Breakdown ({selectedTs?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {detailsError && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger">{detailsError}</Alert>}

          {loadingDetails ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" size="sm" />
              <p className="text-muted small mt-2">Fetching breakdown sheets...</p>
            </div>
          ) : selectedTs ? (
            <div>
              <div className="bg-light p-3 rounded mb-3">
                <div className="row g-2">
                  <Col sm={6}>
                    <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Contractor</div>
                    <div className="fw-bold text-dark">{selectedTs.contractorName}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Week Period</div>
                    <div className="fw-semibold text-dark">{formatWeekRange(selectedTs.weekStartDate)}</div>
                  </Col>
                </div>
              </div>

              <h6 className="fw-bold text-dark mb-2">Daily Entries</h6>
              <div className="table-responsive">
                <table className="enterprise-table table-bordered table-sm align-middle text-center" style={{ width: '100%' }}>
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
                          <td className="fw-semibold">{line.dayOfWeek || getDayOfWeek(line.workDate)}</td>
                          <td>{line.workDate}</td>
                          <td className="fw-bold text-dark">{line.hoursWorked}</td>
                          <td>{line.overtimeHours}</td>
                          <td className="text-start small text-muted">{line.activityDesc || line.activityDescription || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-muted text-center py-3">No logs available for this timesheet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedTs.comments && selectedTs.comments.length > 0 && (
                <div className="mt-3">
                  <h6 className="fw-bold text-dark">Workflow Comments Thread</h6>
                  <div className="d-flex flex-column gap-2 bg-light p-3 rounded">
                    {selectedTs.comments.map((comment) => (
                      <div key={comment.id} className="small border-bottom pb-2">
                        <div className="d-flex justify-content-between">
                          <span className="fw-bold text-dark">{comment.authorName} ({comment.authorRole})</span>
                          <span className="text-muted text-xs">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                         <p className="mb-0 text-muted mt-1">{comment.remarks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-center py-4">No logs available for this timesheet.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button type="button" className="btn-enterprise-secondary" onClick={() => setShowViewModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>

      {/* Action Modal (Approve or Reject with comments) */}
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">
            Review Timesheet Logs
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {selectedTs && (
            <div className="mb-3 bg-light p-3 rounded">
              <div className="small text-muted mb-1">Contractor: <strong className="text-dark">{selectedTs.contractorName}</strong></div>
              <div className="small text-muted">Hours Logged: <strong className="text-dark">{selectedTs.hoursLogged ?? selectedTs.totalHoursLogged ?? '0.00'} hrs</strong></div>
            </div>
          )}
          <Form.Group controlId="approvalComments">
            <Form.Label className="enterprise-form-label">
              Workflow Feedback Comments
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Add feedback or remarks (mandatory for rejections)..."
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
              className="enterprise-form-control"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button type="button" className="btn-enterprise-secondary" onClick={() => setShowActionModal(false)}>Cancel</button>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-danger py-2 px-4"
              onClick={() => handleActionSubmit('REJECT')}
              disabled={submittingAction}
              style={{ borderRadius: 'var(--gf-radius)' }}
            >
              Reject Logs
            </button>
            <button
              type="button"
              className="btn-enterprise-primary py-2 px-4"
              onClick={() => handleActionSubmit('APPROVE')}
              disabled={submittingAction}
            >
              Approve Logs
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TimesheetApprovals;
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Modal, Alert, Spinner, Col } from 'react-bootstrap';
import { getTimesheetsToApprove, getTimesheetDetails, approveTimesheet, rejectTimesheet } from '../../services/approvalService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function TimesheetApprovals() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Timesheets lists
  const [timesheets, setTimesheets] = useState([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('SUBMITTED'); // Default show submitted first
  const [selectedMonthYear, setSelectedMonthYear] = useState(''); // Stores string formatted as 'YYYY-MM'

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [selectedTs, setSelectedTs] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  const [actionType, setActionType] = useState('APPROVE'); // APPROVE or REJECT
  const [remarksText, setRemarksText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (selectedMonthYear) {
        const [year, month] = selectedMonthYear.split('-');
        params.year = year;
        params.month = month;
      }

      const data = await getTimesheetsToApprove(params);
      setTimesheets(data || []);
      setCurrentPage(1); // Reset page on refresh
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimesheets();
  }, [statusFilter, selectedMonthYear]);

  const viewDetails = async (ts) => {
    try {
      setSelectedTs(ts);
      setDetailsError('');
      setLoadingDetails(true);
      setShowViewModal(true);

      const details = await getTimesheetDetails(ts.id);
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

  const handleActionSubmit = async () => {
    if (actionType === 'REJECT' && !remarksText.trim()) {
      showToast('A rejection reason/comment is mandatory.', 'error');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');

      if (actionType === 'APPROVE') {
        await approveTimesheet(selectedTs.id, remarksText);
        showToast(`Timesheet approved successfully.`, 'success');
        setTimesheets(prev => prev.map(t => t.id === selectedTs.id ? { ...t, status: 'APPROVED' } : t));
      } else {
        await rejectTimesheet(selectedTs.id, remarksText);
        showToast(`Timesheet rejected and returned to contractor.`, 'success');
        setTimesheets(prev => prev.map(t => t.id === selectedTs.id ? { ...t, status: 'REJECTED' } : t));
      }

      setShowActionModal(false);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helper to parse day of week from date
  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } catch (e) {
      return '';
    }
  };

  // Local client filter (search + client-side month/year fallback)
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((item) => {
      // Search matching
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || (
        (item.contractorName && item.contractorName.toLowerCase().includes(q)) ||
        (item.assignmentId && item.assignmentId.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
      );

      // Month-Year matching fallback
      let matchesMonthYear = true;
      if (selectedMonthYear) {
        const startDate = item.weekStartDate || item.startDate || '';
        if (startDate) {
          // Compare YYYY-MM prefix from start date
          matchesMonthYear = startDate.startsWith(selectedMonthYear);
        }
      }

      return matchesSearch && matchesMonthYear;
    });
  }, [timesheets, searchQuery, selectedMonthYear]);

  // Pagination Logic
  const totalItems = filteredTimesheets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const currentTimesheets = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTimesheets.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTimesheets, currentPage, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 className="page-title mb-1">Timesheet Approvals</h1>
          <p className="muted-text mb-0">Sign off on contractor weekly log sheets or return them for edits.</p>
        </div>

        {/* Filter Controls Bar */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Calendar Month & Year Picker */}
          <div className="d-flex align-items-center gap-1">
            <Form.Control
              type="month"
              value={selectedMonthYear}
              onChange={(e) => {
                setSelectedMonthYear(e.target.value);
                setCurrentPage(1);
              }}
              className="enterprise-form-control"
              style={{ width: '180px' }}
            />
            {selectedMonthYear && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                title="Clear date filter"
                onClick={() => {
                  setSelectedMonthYear('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Form.Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="enterprise-form-select"
            style={{ width: '170px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Loading submitted logs..." />
      ) : (
        <div>
          {filteredTimesheets.length > 0 ? (
            <>
              <Table headers={['Timesheet ID', 'Contractor', 'Week Period', 'Regular Hours', 'Overtime', 'Billable Cost', 'Status', 'Actions']}>
                {currentTimesheets.map((ts) => {
                  const start = ts.weekStartDate || ts.startDate || '';
                  const end = ts.weekEndDate || ts.endDate || '';
                  const regularHours = ts.hoursLogged ?? ts.totalHoursLogged ?? '0.00';
                  const overtimeHours = ts.overtimeLogged ?? ts.totalOvertimeHoursLogged ?? '0.00';

                  return (
                    <tr key={ts.id}>
                      <td className="fw-bold">{ts.id}</td>
                      <td className="fw-semibold text-dark">{ts.contractorName || 'Contractor'}</td>
                      <td className="small">
                        <span className="fw-medium">{start}</span> to <span className="fw-medium">{end}</span>
                      </td>
                      <td className="fw-semibold">{regularHours} hrs</td>
                      <td>{overtimeHours} hrs</td>
                      <td className="text-success fw-bold">₹{parseFloat(ts.billableAmount || '0').toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`status-pill ${ts.status.toLowerCase() === 'approved' ? 'success' : ts.status.toLowerCase() === 'submitted' ? 'pending' : 'rejected'}`}>
                          {ts.status}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-start">
                          <button type="button" className="btn-enterprise-secondary py-1 px-3" onClick={() => viewDetails(ts)}>
                            View Logs
                          </button>

                          {ts.status === 'SUBMITTED' && (
                            <>
                              <button type="button" className="btn-enterprise-primary py-1 px-3" onClick={() => openActionModal(ts, 'APPROVE')}>
                                Approve
                              </button>
                              <button type="button" className="btn-enterprise-ghost text-danger py-1 px-3 border-0" onClick={() => openActionModal(ts, 'REJECT')}>
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Table>

              {/* Pagination Controls */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 px-2">
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <span>Rows per page:</span>
                  <Form.Select
                    size="sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ width: '70px' }}
                    className="enterprise-form-select"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </Form.Select>
                  <span>
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-1">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="enterprise-table-container p-5 text-center text-muted">
              <i className="bi bi-clock fs-2"></i>
              <p className="small mt-2 mb-0">No timesheets found matching the selected filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Daily Breakdown Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered contentClassName="enterprise-modal-content">
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
                    <div className="small text-muted text-uppercase font-bold" style={{ fontSize: '10px' }}>Assignment Reference</div>
                    <div className="fw-semibold text-dark">{selectedTs.assignmentId}</div>
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
      <Modal show={showActionModal} onHide={() => setShowActionModal(false)} centered contentClassName="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">
            {actionType === 'APPROVE' ? 'Approve Timesheet' : 'Reject Timesheet'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          <Form.Group controlId="approvalComments">
            <Form.Label className="enterprise-form-label">
              {actionType === 'APPROVE' ? 'Remarks (Optional)' : 'Rejection Reason (Mandatory) *'}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={actionType === 'APPROVE' ? 'Add signing remarks...' : 'Provide details on what needs correction...'}
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
              className="enterprise-form-control"
              required={actionType === 'REJECT'}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button type="button" className="btn-enterprise-secondary" onClick={() => setShowActionModal(false)}>Cancel</button>
          <button
            type="button"
            className={actionType === 'APPROVE' ? 'btn-enterprise-primary' : 'btn-enterprise-primary bg-danger border-danger'}
            onClick={handleActionSubmit}
            disabled={submittingAction}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : actionType === 'APPROVE' ? 'Approve Logs' : 'Reject Logs'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TimesheetApprovals;
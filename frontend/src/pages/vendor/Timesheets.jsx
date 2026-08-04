import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal } from 'react-bootstrap';
import { getTimesheets, getTimesheetDetails } from '../../services/vendorTimesheetService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/vendor/LoadingSpinner';
import Pagination from '../../components/vendor/Pagination';

const PAGE_SIZE = 10;

function Timesheets() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Status filter
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(0);

  // Timesheets state
  const [timesheets, setTimesheets] = useState([]);

  // Detail Modal
  const [selectedTs, setSelectedTs] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTimesheets({ status: statusFilter || undefined });
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

  useEffect(() => {
    setPage(0);
  }, [searchVal, filterStartDate, filterEndDate, statusFilter]);

  const handleView = async (id) => {
    try {
      setError('');
      const details = await getTimesheetDetails(id);
      setSelectedTs(details);
      setShowDetailModal(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'approved';
      case 'SUBMITTED': return 'info';
      case 'DRAFT': return 'pending';
      default: return 'rejected';
    }
  };

  // Local Search filtering
  const filteredTimesheets = timesheets.filter(t => {
    let match = true;
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      match = (
        t.contractorName?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
      );
    }
    if (match && filterStartDate) {
      if (new Date(t.startDate) < new Date(filterStartDate)) match = false;
    }
    if (match && filterEndDate) {
      if (new Date(t.endDate) > new Date(filterEndDate)) match = false;
    }
    return match;
  });

  const totalPages = Math.ceil(filteredTimesheets.length / PAGE_SIZE) || 1;
  const paginatedTimesheets = filteredTimesheets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Timesheets Tracker</h2>
        <p className="text-muted small mt-1 mb-0">Review weekly hours logged by contractors and track approval progress (Read-Only).</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <div className="d-flex gap-3 mb-4 align-items-center">
        <div style={{ maxWidth: '200px' }}>
          <label className="form-label small text-muted mb-1">Status</label>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVISED">Revised</option>
          </select>
        </div>
        <div style={{ maxWidth: '200px' }}>
          <label className="form-label small text-muted mb-1">Start Date</label>
          <input type="date" className="form-control" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
        </div>
        <div style={{ maxWidth: '200px' }}>
          <label className="form-label small text-muted mb-1">End Date</label>
          <input type="date" className="form-control" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>
        {(filterStartDate || filterEndDate || statusFilter) && (
          <div className="mt-4">
            <Button variant="outline-secondary" size="sm" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setStatusFilter(''); }}>Clear Filters</Button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Accessing contractor work logs..." />
      ) : filteredTimesheets.length > 0 ? (
        <Card className="gf-card p-4 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Contractor</th>
                  <th>Week Period</th>
                  <th>Total Hours</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTimesheets.map(t => (
                  <tr key={t.id}>
                    <td className="fw-semibold text-slate-800">{t.contractorName}</td>
                    <td className="small">{t.startDate} to {t.endDate}</td>
                    <td>{t.totalHoursLogged} hrs</td>
                    <td className="text-green-600 fw-bold">${parseFloat(t.billableAmount || '0').toLocaleString()}</td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-primary" onClick={() => handleView(t.id)}>
                        View Daily Logs
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <div className="mb-3 text-muted">
            <i className="bi bi-clock" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <p className="text-muted small mb-0">No timesheet records submitted by contractors.</p>
        </div>
      )}

      {/* Daily Logs View Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Weekly Daily Logs Review</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedTs && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-slate-800 mb-0">{selectedTs.contractorName}</h5>
                  <span className="text-muted small">Period: {selectedTs.startDate} &mdash; {selectedTs.endDate}</span>
                </div>
                <span className={`gf-badge badge-${getStatusBadge(selectedTs.status)}`}>{selectedTs.status}</span>
              </div>

              <Table bordered size="sm" className="small mb-3">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th className="text-center">Regular Hrs</th>
                    <th className="text-center">Overtime Hrs</th>
                    <th>Activity</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTs.lines && selectedTs.lines.length > 0 ? (
                    <>
                      {selectedTs.lines.map(line => (
                        <tr key={line.id || line.workDate}>
                          <td>{line.workDate}</td>
                          <td className="text-center">{parseFloat(line.hoursWorked) || 0}</td>
                          <td className="text-center">{parseFloat(line.overtimeHours) || 0}</td>
                          <td>{line.activityDesc || '-'}</td>
                          <td className="text-center">
                            <span className={`gf-badge badge-${getStatusBadge(line.status)}`} style={{ fontSize: '10px' }}>
                              {line.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="table-primary fw-bold">
                        <td colSpan={2}>Total</td>
                        <td colSpan={3}>{selectedTs.totalHoursLogged || 0} hrs</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">No daily log lines recorded for this timesheet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {selectedTs.remarks && (
                <div className="small bg-light p-2 rounded mb-3">
                  <strong>Notes:</strong> {selectedTs.remarks}
                </div>
              )}

              {selectedTs.comments && selectedTs.comments.length > 0 && (
                <div className="border-top pt-3">
                  <h6 className="fw-bold mb-2">Comment History</h6>
                  <div className="d-flex flex-column gap-2">
                    {selectedTs.comments.map(c => (
                      <div className="p-2 rounded bg-light border-start border-3 border-secondary text-xs" key={c.id || Math.random()}>
                        <div className="fw-bold text-slate-800 mb-1">{c.userName || 'System'}:</div>
                        <p className="mb-0 text-slate-600">{c.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Review</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Timesheets;

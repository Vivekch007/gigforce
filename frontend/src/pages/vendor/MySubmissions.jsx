import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getSubmissions, withdrawSubmission, getSubmissionDetails } from '../../services/submissionService';
import { getErrorMessage } from '../../services/errorUtils';
import { useConfirmation } from '../../context/ConfirmationContext';

// Reusable components
import LoadingSpinner from '../../components/vendor/LoadingSpinner';
import Pagination from '../../components/vendor/Pagination';

function MySubmissions() {
  const { showConfirmation } = useConfirmation();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Submissions list
  const [submissions, setSubmissions] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // New Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // Format: YYYY-MM

  // Detail Modal
  const [selectedSub, setSelectedSub] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchVal, statusFilter, selectedMonth]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, size: 10 };

      if (searchVal.trim()) {
        params.search = searchVal.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (selectedMonth) {
        params.month = selectedMonth;
      }

      const data = await getSubmissions(params);
      setSubmissions(data?.content || []);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [page, searchVal, statusFilter, selectedMonth]);

  const handleWithdraw = async (submissionId) => {
    const confirmed = await showConfirmation({
      title: 'Withdraw Candidate',
      message: 'Are you sure you want to withdraw this candidate submission?'
    });
    if (!confirmed) return;
    try {
      setError('');
      setSuccess('');
      await withdrawSubmission(submissionId);
      setSuccess('Submission withdrawn successfully.');
      loadSubmissions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleView = async (id) => {
    try {
      setError('');
      const details = await getSubmissionDetails(id);
      setSelectedSub(details);
      setShowDetailModal(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Status style helper
  const getBadgeType = (status) => {
    switch (status?.toUpperCase()) {
      case 'SELECTED':
      case 'SHORTLISTED': return 'approved';
      case 'INTERVIEW_SCHEDULED': return 'info';
      case 'UNDER_REVIEW':
      case 'SUBMITTED': return 'pending';
      default: return 'rejected';
    }
  };

  // Local filtering fallbacks for client-side evaluation
  const filteredSubmissions = submissions.filter(s => {
    // Search text filter
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const matchesSearch = (
        s.contractorName?.toLowerCase().includes(q) ||
        s.requisitionTitle?.toLowerCase().includes(q) ||
        s.clientName?.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter && s.status?.toUpperCase() !== statusFilter.toUpperCase()) {
      return false;
    }

    // Month filter (YYYY-MM)
    if (selectedMonth && s.submissionDate) {
      const subMonth = s.submissionDate.substring(0, 7); // Extracts YYYY-MM from YYYY-MM-DD
      if (subMonth !== selectedMonth) return false;
    }

    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header & Top Right Filters */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">My Submissions</h2>
          <p className="text-muted small mt-1 mb-0">Track statuses of candidates submitted to client jobs and manage active proposals.</p>
        </div>

        {/* Top-Right Filters (Status + Month Sort) */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Select
            size="sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="SELECTED">Selected</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </Form.Select>

          <Form.Control
            type="month"
            size="sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '160px' }}
          />

          {(statusFilter || selectedMonth) && (
            <Button
              size="sm"
              variant="link"
              className="text-decoration-none text-muted p-0 ms-1"
              onClick={() => { setStatusFilter(''); setSelectedMonth(''); }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying submissions log..." />
      ) : filteredSubmissions.length > 0 ? (
        <Card className="gf-card p-4 border-0 shadow-sm">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Submission ID</th>
                  <th>Candidate</th>
                  <th>Job Title</th>
                  <th>Client</th>
                  <th>Proposed Rate</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(s => (
                  <tr key={s.id}>
                    <td className="fw-bold">{s.id}</td>
                    <td>{s.contractorName}</td>
                    <td>{s.requisitionTitle || 'Specialist'}</td>
                    <td>{s.clientName || 'Partner Client'}</td>
                    <td className="text-green-600 fw-bold">${s.proposedRate || 400}/day</td>
                    <td>
                      <span className={`gf-badge badge-${getBadgeType(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => handleView(s.id)}>
                          View
                        </Button>
                        {(s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW') && (
                          <Button size="sm" variant="outline-danger" onClick={() => handleWithdraw(s.id)}>
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0 shadow-sm">
          <span className="fs-1">📥</span>
          <p className="text-muted small mt-2 mb-0">No active candidate submissions tracked matching the selected criteria.</p>
        </div>
      )}

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Submission Audit log</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedSub && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-slate-800 mb-0">{selectedSub.contractorName}</h5>
                <span className={`gf-badge badge-${getBadgeType(selectedSub.status)}`}>{selectedSub.status}</span>
              </div>
              <hr />
              <div className="row g-3 small">
                <div className="col-6">
                  <strong>Job Requisition:</strong> {selectedSub.requisitionTitle || 'Specialist'}
                </div>
                <div className="col-6">
                  <strong>Client BU:</strong> {selectedSub.clientName || 'Client BU'}
                </div>
                <div className="col-6">
                  <strong>Proposed Rate:</strong> ${selectedSub.proposedRate || 400}/day
                </div>
                <div className="col-6">
                  <strong>Submit Date:</strong> {selectedSub.submissionDate || 'Recently'}
                </div>
                {selectedSub.remarks && (
                  <div className="col-12 border-top pt-2">
                    <strong>Workflow Remarks:</strong>
                    <p className="text-muted mt-1 mb-0">{selectedSub.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Audit</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default MySubmissions;
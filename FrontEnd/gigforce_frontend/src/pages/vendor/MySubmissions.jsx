import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal } from 'react-bootstrap';
import { getSubmissions, withdrawSubmission, getSubmissionDetails } from '../../services/submissionService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function MySubmissions() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Submissions list
  const [submissions, setSubmissions] = useState([]);

  // Detail Modal
  const [selectedSub, setSelectedSub] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSubmissions();
      setSubmissions(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleWithdraw = async (subId) => {
    if (!window.confirm('Are you sure you want to withdraw this candidate submission?')) return;
    try {
      setError('');
      setSuccess('');
      await withdrawSubmission(subId);
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
      case 'SELECTED': return 'approved';
      case 'SHORTLISTED': return 'approved';
      case 'INTERVIEW_SCHEDULED': return 'info';
      case 'UNDER_REVIEW': return 'pending';
      case 'SUBMITTED': return 'pending';
      default: return 'rejected';
    }
  };

  // Local Search filtering
  const filteredSubmissions = submissions.filter(s => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    return (
      s.contractorName?.toLowerCase().includes(q) ||
      s.requisitionTitle?.toLowerCase().includes(q) ||
      s.clientName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">My Submissions</h2>
        <p className="text-muted small mt-1 mb-0">Track statuses of candidates submitted to client jobs and manage active proposals.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying submissions log..." />
      ) : filteredSubmissions.length > 0 ? (
        <Card className="gf-card p-4 border-0">
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
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">📥</span>
          <p className="text-muted small mt-2 mb-0">No active candidate submissions tracked.</p>
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

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, requestAssignmentExtension } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import AssignmentDrawer from '../../components/vendor/AssignmentDrawer';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function Assignments() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assignments state
  const [assignments, setAssignments] = useState([]);

  // Offcanvas details drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAsn, setSelectedAsn] = useState(null);

  // Extension Modal
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extAsn, setExtAsn] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [extRemarks, setExtRemarks] = useState('');
  const [submittingExt, setSubmittingExt] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAssignments();
      setAssignments(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const openDrawer = async (asnId) => {
    try {
      setError('');
      const details = await getAssignmentDetails(asnId);
      setSelectedAsn(details);
      setShowDrawer(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openExtensionModal = (asn) => {
    setExtAsn(asn);
    setNewEndDate('');
    setExtRemarks('');
    setShowExtensionModal(true);
  };

  const handleRequestExtension = async () => {
    if (!newEndDate) {
      setError('Please select a target extension end date.');
      return;
    }

    try {
      setSubmittingExt(true);
      setError('');
      setSuccess('');

      const payload = {
        effectiveDate: new Date().toISOString().split('T')[0],
        newValue: newEndDate,
        remarks: extRemarks,
      };

      await requestAssignmentExtension(extAsn.id, payload);
      setSuccess(`Extension amendment request submitted for contractor: ${extAsn.contractorName}!`);
      setShowExtensionModal(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingExt(false);
    }
  };

  // Local Search filtering
  const filteredAssignments = assignments.filter(a => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    return (
      a.contractorName?.toLowerCase().includes(q) ||
      a.clientName?.toLowerCase().includes(q) ||
      a.requisitionTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Assignments Tracker</h2>
        <p className="text-muted small mt-1 mb-0">Track active contractor placements, review SOW agreements, and request contract extensions.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Retrieving placements..." />
      ) : filteredAssignments.length > 0 ? (
        <Card className="gf-card p-4 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Assignment ID</th>
                  <th>Contractor</th>
                  <th>Client</th>
                  <th>Job Title</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(a => (
                  <tr key={a.id}>
                    <td className="fw-bold">{a.id}</td>
                    <td>{a.contractorName}</td>
                    <td>{a.clientName || 'Partner Client'}</td>
                    <td>{a.requisitionTitle || 'Specialist'}</td>
                    <td>{a.startDate}</td>
                    <td>{a.endDate || 'Ongoing'}</td>
                    <td>
                      <span className={`gf-badge badge-${a.status === 'ACTIVE' ? 'approved' : 'rejected'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => openDrawer(a.id)}>
                          View Agreement
                        </Button>
                        {a.status === 'ACTIVE' && (
                          <Button size="sm" className="btn-gf-primary" onClick={() => openExtensionModal(a)}>
                            Request Extension
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
          <span className="fs-1">📋</span>
          <p className="text-muted small mt-2 mb-0">No placements or active assignments found.</p>
        </div>
      )}

      {/* Details drawer */}
      <AssignmentDrawer show={showDrawer} onHide={() => setShowDrawer(false)} assignment={selectedAsn} />

      {/* Extension request modal */}
      <Modal show={showExtensionModal} onHide={() => setShowExtensionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Request Assignment Extension</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {extAsn && (
            <div>
              <div className="mb-3">
                <span className="text-muted text-xs">Contractor</span>
                <h6 className="fw-bold text-slate-800">{extAsn.contractorName}</h6>
                <span className="text-muted small">Current End Date: {extAsn.endDate || 'Ongoing'}</span>
              </div>

              <Form.Group className="mb-3" controlId="newEndDate">
                <Form.Label className="uppercase-label">Proposed New End Date</Form.Label>
                <Form.Control
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="remarks">
                <Form.Label className="uppercase-label">Extension Rationale</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="e.g. Project timeline extended. Continuing deliverables."
                  value={extRemarks}
                  onChange={(e) => setExtRemarks(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtensionModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleRequestExtension} disabled={submittingExt}>
            {submittingExt ? 'Submitting...' : 'Request Extension'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Assignments;

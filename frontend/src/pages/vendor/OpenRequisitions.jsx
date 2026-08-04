import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Alert, Modal } from 'react-bootstrap';
import { getRequisitions, getRequisitionDetails } from '../../services/vendorRequisitionService';
import { getCandidates } from '../../services/candidateService';
import { submitCandidateToRequisition } from '../../services/submissionService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';

// Reusable custom components
import VendorFilters from '../../components/vendor/VendorFilters';
import Loader from '../../components/Loader';
import Pagination from '../../components/vendor/Pagination';
import Table from '../../components/Table';

function OpenRequisitions() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Requisitions state
  const [requisitions, setRequisitions] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [clientFilter, setClientFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');

  // Modals
  const [selectedReq, setSelectedReq] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Submit Candidate modal (in-page, no redirect)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitReq, setSubmitReq] = useState(null);
  const [poolCandidates, setPoolCandidates] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [submitting, setSubmitting] = useState(false);



  const loadRequisitions = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        size: 10,
        status: 'OPEN',
        search: searchVal || undefined,
        clientName: clientFilter || undefined,
        skill: skillFilter || undefined,
        minExperience: expFilter || undefined,
      };

      const res = await getRequisitions(params);
      setRequisitions(res?.content || []);
      setTotalPages(res?.totalPages || 1);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, [page, searchVal, clientFilter, skillFilter, expFilter]);

  const viewDetails = async (reqId) => {
    try {
      setError('');
      const details = await getRequisitionDetails(reqId);
      setSelectedReq(details);
      setShowDetailModal(true);
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    }
  };

  const openSubmitCandidateModal = async (req) => {
    setSubmitReq(req);
    setSelectedCandidateId('');
    setProposedRate('');
    setShowSubmitModal(true);
    try {
      setLoadingPool(true);
      const data = await getCandidates({ size: 100, availability: 'AVAILABLE' });
      setPoolCandidates(data?.content || []);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoadingPool(false);
    }
  };

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidateId(candidateId);
    const cand = poolCandidates.find(c => String(c.id) === String(candidateId));
    setProposedRate(cand?.rate || '');
  };

  const handleSubmitCandidate = async () => {
    if (!selectedCandidateId) {
      showToast('Please select a candidate first.', 'warning');
      return;
    }
    if (!proposedRate) {
      showToast('Please provide a proposed rate.', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      await submitCandidateToRequisition(submitReq.id, {
        contractorProfileId: selectedCandidateId,
        proposedRate: parseFloat(proposedRate)
      });
      showToast('Candidate submitted successfully!', 'success');
      setShowSubmitModal(false);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupees = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `₹ ${formatted}`;
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">Open Job Requisitions</h1>
        <p className="muted-text">View open demands posted by clients, check skill criteria, and submit candidate profiles.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {/* Filter Row */}
      <div className="enterprise-table-container p-3 mb-4 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="d-flex flex-wrap gap-3 align-items-center">

            <VendorFilters
              label="Skill"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              options={[
                { value: '', label: 'All Skills' },
                { value: 'Java', label: 'Java' },
                { value: 'React', label: 'React' },
                { value: 'AWS', label: 'AWS' },
              ]}
            />
            <VendorFilters
              label="Experience"
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              options={[
                { value: '', label: 'Any Experience' },
                { value: '2', label: '2+ Years' },
                { value: '5', label: '5+ Years' },
                { value: '8', label: '8+ Years' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Requisitions Grid */}
      {loading ? (
        <Loader message="Searching open postings..." />
      ) : requisitions.length > 0 ? (
        <div>
          <Table headers={['Job Title', 'Client', 'Core Skill', 'Experience', 'Positions', 'Rate Budget', 'Actions']}>
            {requisitions.map(req => (
              <tr key={req.id}>
                <td>
                  <span className="fw-semibold text-dark d-block">{req.title || req.jobTitle}</span>
                  <span className="text-muted small" style={{ fontSize: '11px' }}>ID: {req.id}</span>
                </td>
                <td>{req.clientName || req.businessUnitId || 'Client BU'}</td>
                <td>{req.requiredSkillName || req.requiredSkillId || 'Java'}</td>
                <td>{req.minExperienceYears || 3} yrs</td>
                <td>{req.quantity} vacant</td>
                <td className="text-success fw-bold">{formatRupees(req.maxHourlyRate || 500)}/hr</td>
                <td>
                  <div className="d-flex gap-2 justify-content-start">
                    <button className="btn-enterprise-secondary py-1 px-3" onClick={() => viewDetails(req.id)}>
                      View Details
                    </button>
                    <button className="btn-enterprise-primary py-1 px-3" onClick={() => openSubmitCandidateModal(req)}>
                      Submit Candidate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-briefcase fs-1 text-muted"></i>
          <p className="text-muted small mt-2 mb-0">No open job postings found matching criteria.</p>
        </div>
      )}

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg" className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Job Specification Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {selectedReq && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold text-primary mb-0">{selectedReq.title || selectedReq.jobTitle}</h4>
                <span className="status-pill success">{selectedReq.status}</span>
              </div>
              <p className="text-muted small">{selectedReq.description || 'No detailed description logged.'}</p>
              <hr />
              <div className="row g-3 small text-dark">
                <div className="col-sm-6">
                  <strong>Client Partner:</strong> {selectedReq.clientName || 'Partner Client'}
                </div>
                <div className="col-sm-6">
                  <strong>Core Required Skill:</strong> {selectedReq.requiredSkillName || 'Technical'}
                </div>
                <div className="col-sm-6">
                  <strong>Engagement Format:</strong> {selectedReq.engagementType || 'REMOTE'}
                </div>
                <div className="col-sm-6">
                  <strong>Experience Requirement:</strong> {selectedReq.minExperienceYears} Years Minimum
                </div>
                <div className="col-sm-6">
                  <strong>Daily Rate Budget Max:</strong> {formatRupees(selectedReq.maxHourlyRate || 500)}/hr
                </div>
                <div className="col-sm-6">
                  <strong>Start Date Target:</strong> {selectedReq.startDate}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowDetailModal(false)}>Close Specifications</button>
        </Modal.Footer>
      </Modal>

      {/* Submit Candidate Modal (stays on this page - no redirect) */}
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Submit Candidate</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {submitReq && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Requisition</span>
                <h6 className="fw-bold text-dark mt-1">{submitReq.title || submitReq.jobTitle}</h6>
              </div>

              <Form.Group className="mb-3" controlId="submitCandidateSelect">
                <Form.Label className="enterprise-form-label">Select Candidate</Form.Label>
                {loadingPool ? (
                  <div className="text-muted small py-2">Loading candidate pool...</div>
                ) : (
                  <Form.Select
                    value={selectedCandidateId}
                    onChange={(e) => handleCandidateSelect(e.target.value)}
                  >
                    <option value="">-- Select Candidate --</option>
                    {poolCandidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name} &middot; {c.skills || 'No skills listed'}</option>
                    ))}
                  </Form.Select>
                )}
                {!loadingPool && poolCandidates.length === 0 && (
                  <div className="text-muted small mt-2">No available candidates found in your pool.</div>
                )}
              </Form.Group>

              <Form.Group controlId="submitProposedRate">
                <Form.Label className="enterprise-form-label">Proposed Rate (₹/day)</Form.Label>
                <Form.Control
                  type="number"
                  className="enterprise-form-control"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleSubmitCandidate} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Confirm Submission'}
          </button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}

export default OpenRequisitions;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Form, Modal, Row, Col } from 'react-bootstrap';
import { getCandidates } from '../../services/candidateService';
import { getRequisitions } from '../../services/vendorRequisitionService';
import { submitCandidateToRequisition, getSubmissions } from '../../services/submissionService';
import { getSkills } from '../../services/skillCatalogService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';

// Reusable components
import CandidateCard from '../../components/vendor/CandidateCard';
import Loader from '../../components/Loader';
import Pagination from '../../components/vendor/Pagination';
import VendorFilters from '../../components/vendor/VendorFilters';

function CandidateDatabase() {
  const { showToast } = useToast() || { showToast: window.showToast };
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';
  const initialReqId = searchParams.get('reqId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Data
  const [candidates, setCandidates] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [availFilter, setAvailFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [rateFilter, setRateFilter] = useState('');

  // Requisitions (for submission dropdown)
  const [openReqs, setOpenReqs] = useState([]);
  const [globalSelectedReq, setGlobalSelectedReq] = useState(initialReqId);

  // Contractor IDs already submitted to the currently-selected requisition (any status) -
  // hidden from the pool since resubmitting them is rejected by the backend anyway.
  const [submittedCandidateIds, setSubmittedCandidateIds] = useState(new Set());

  // Master skill catalog (for the Skill filter)
  const [masterSkills, setMasterSkills] = useState([]);

  // Submit Candidate to Req Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCand, setSubmitCand] = useState(null);
  const [proposedRate, setProposedRate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCandidatesData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        size: 10,
        name: searchVal || undefined,
        availability: availFilter || undefined,
        skill: skillFilter || undefined,
        minExperience: expFilter || undefined,
        availableFromDate: dateFilter || undefined,
        minHourlyRate: rateFilter || undefined,
      };
      const data = await getCandidates(params);
      setCandidates(data?.content || []);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRequisitions = async () => {
    try {
      const res = await getRequisitions({ status: 'OPEN', size: 100 });
      setOpenReqs(res?.content || []);
    } catch (err) {
      console.error("Failed to load requisitions", err);
    }
  };

  const loadMasterSkills = async () => {
    try {
      const res = await getSkills();
      setMasterSkills(Array.isArray(res) ? res : (res?.content || []));
    } catch (err) {
      console.error("Failed to load skill catalog", err);
    }
  };

  useEffect(() => {
    loadCandidatesData();
  }, [page, searchVal, availFilter, skillFilter, expFilter, dateFilter, rateFilter]);

  useEffect(() => {
    loadRequisitions();
    loadMasterSkills();
  }, []);

  useEffect(() => {
    if (!globalSelectedReq) {
      setSubmittedCandidateIds(new Set());
      return;
    }
    let active = true;
    getSubmissions({ requisitionId: globalSelectedReq, size: 100 })
      .then(data => {
        if (!active) return;
        setSubmittedCandidateIds(new Set((data?.content || []).map(s => String(s.contractorProfileId))));
      })
      .catch(() => { if (active) setSubmittedCandidateIds(new Set()); });
    return () => { active = false; };
  }, [globalSelectedReq]);

  const visibleCandidates = candidates.filter(c => !submittedCandidateIds.has(String(c.id)));

  const initiateSubmitCandidate = (cand) => {
    setSubmitCand(cand);
    setProposedRate(cand.rate || '');
    setShowSubmitModal(true);
  };

  const handleSubmitCandidate = async () => {
    if (!globalSelectedReq) {
      if (showToast) showToast('Please select a requisition first.', 'warning');
      return;
    }
    if (!proposedRate) {
      if (showToast) showToast('Please provide a proposed rate.', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await submitCandidateToRequisition(globalSelectedReq, {
        contractorProfileId: submitCand.id,
        proposedRate: parseFloat(proposedRate)
      });
      if (showToast) showToast(`Candidate ${submitCand.name} submitted successfully!`, 'success');
      setShowSubmitModal(false);
      // Keep the requisition selected so the vendor can submit more candidates
      // to the same requisition without re-picking it every time.
    } catch (err) {
      setError(getErrorMessage(err));
      if (showToast) showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="page-title mb-1">Candidate Database</h1>
          <p className="muted-text">View your organization's staffing pool and submit candidates to requisitions.</p>
        </div>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {/* Filter & Action Row */}
      <div className="enterprise-table-container p-3 mb-4 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-3">
          <div className="d-flex flex-wrap gap-3 align-items-center flex-grow-1">
            <VendorFilters
              label="Availability"
              value={availFilter}
              onChange={(e) => setAvailFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'AVAILABLE', label: 'Available' },
                { value: 'ON_ASSIGNMENT', label: 'On Assignment' },
                { value: 'ON_NOTICE', label: 'On Notice' },
              ]}
            />
            <VendorFilters
              label="Skill"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              options={[
                { value: '', label: 'All Skills' },
                ...masterSkills.map(s => ({ value: s.name, label: s.name })),
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
            <div>
              <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>Available By</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div>
              <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>Min Rate (₹)</Form.Label>
              <Form.Control
                type="number"
                size="sm"
                placeholder="e.g. 5000"
                value={rateFilter}
                onChange={(e) => setRateFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="border-start ps-3">
             <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>Select Requisition to Submit Candidate</Form.Label>
             <Form.Select 
                size="sm" 
                value={globalSelectedReq} 
                onChange={e => setGlobalSelectedReq(e.target.value)}
             >
                <option value="">-- Select Requisition --</option>
                {openReqs.map(req => (
                  <option key={req.id} value={req.id}>{req.title || req.jobTitle} (ID: {req.id})</option>
                ))}
             </Form.Select>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader message="Accessing candidate records..." />
      ) : visibleCandidates.length > 0 ? (
        <>
          <Row className="g-4 mb-4">
            {visibleCandidates.map(c => (
              <Col lg={4} md={6} key={c.id}>
                <CandidateCard
                  candidate={c}
                  onSubmitCandidate={globalSelectedReq ? initiateSubmitCandidate : null}
                />
              </Col>
            ))}
          </Row>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-people fs-1 text-muted"></i>
          <h5 className="fw-semibold mt-3 text-dark">No candidates found</h5>
          <p className="text-muted small mb-4">
            {globalSelectedReq
              ? 'No contractors match your current filters, or everyone eligible has already been submitted to this requisition.'
              : 'No contractors match your current filters. Try adjusting or clearing them.'}
          </p>
        </div>
      )}

      {/* Submit Candidate Modal */}
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} centered contentClassName="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Submit to Requisition</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {submitCand && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Candidate</span>
                <h6 className="fw-bold text-dark mt-1">{submitCand.name}</h6>
              </div>

              <Form.Group controlId="proposedRate" className="mt-3">
                <Form.Label className="enterprise-form-label">Confirm Proposed Rate (₹/day)</Form.Label>
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

export default CandidateDatabase;

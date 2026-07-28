import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Form, Alert, Modal } from 'react-bootstrap';
import { getRequisitions, getRequisitionDetails } from '../../services/vendorRequisitionService';
import { getCandidates } from '../../services/candidateService';
import { submitCandidateToRequisition } from '../../services/submissionService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable custom components
import VendorSearchBar from '../../components/vendor/VendorSearchBar';
import VendorFilters from '../../components/vendor/VendorFilters';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';
import Pagination from '../../components/vendor/Pagination';

function OpenRequisitions() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
  
  const [submitReq, setSubmitReq] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandId, setSelectedCandId] = useState('');
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
    }
  };

  const openSubmitCandidateModal = async (req) => {
    try {
      setError('');
      setSubmitReq(req);
      const cands = await getCandidates();
      setCandidates(cands.filter(c => c.availability === 'AVAILABLE'));
      setShowSubmitModal(true);
      setSelectedCandId('');
      setProposedRate('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSubmitCandidate = async () => {
    if (!selectedCandId || !proposedRate) {
      setError('Please select a candidate and input proposed rate.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await submitCandidateToRequisition(submitReq.id, {
        contractorProfileId: selectedCandId,
        proposedRate: parseFloat(proposedRate),
      });

      setSuccess(`Candidate successfully submitted for position: ${submitReq.title}!`);
      setShowSubmitModal(false);
      loadRequisitions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Open Job Requisitions</h2>
        <p className="text-muted small mt-1 mb-0">View open demands posted by clients, check skill criteria, and submit candidate profiles.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Filter Row */}
      <Card className="gf-card p-3 mb-4 border-0">
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <VendorFilters
              label="Client"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              options={[
                { value: '', label: 'All Clients' },
                { value: 'Google BU', label: 'Google BU' },
                { value: 'Meta Apps', label: 'Meta Apps' },
                { value: 'Amazon Logistics', label: 'Amazon Logistics' },
              ]}
            />
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
      </Card>

      {/* Requisitions Grid */}
      {loading ? (
        <LoadingSpinner message="Searching open postings..." />
      ) : requisitions.length > 0 ? (
        <Card className="gf-card p-4 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Job Title</th>
                  <th>Client</th>
                  <th>Core Skill</th>
                  <th>Experience</th>
                  <th>Positions</th>
                  <th>Rate Budget</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map(req => (
                  <tr key={req.id}>
                    <td>
                      <span className="fw-semibold text-slate-800 d-block">{req.title || req.jobTitle}</span>
                      <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>ID: {req.id}</span>
                    </td>
                    <td>{req.clientName || req.businessUnitId || 'Client BU'}</td>
                    <td>{req.requiredSkillName || req.requiredSkillId || 'Java'}</td>
                    <td>{req.minExperienceYears || 3} yrs</td>
                    <td>{req.quantity} vacant</td>
                    <td className="text-green-600 fw-semibold">${req.maxHourlyRate || 50}/hr</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => viewDetails(req.id)}>
                          View Details
                        </Button>
                        <Button size="sm" className="btn-gf-primary" onClick={() => openSubmitCandidateModal(req)}>
                          Submit Candidate
                        </Button>
                      </div>
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
          <span className="fs-1">💼</span>
          <p className="text-muted small mt-2 mb-0">No open job postings found matching criteria.</p>
        </div>
      )}

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Job Specification Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedReq && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold text-primary mb-0">{selectedReq.title || selectedReq.jobTitle}</h4>
                <span className="gf-badge badge-approved">{selectedReq.status}</span>
              </div>
              <p className="text-muted">{selectedReq.description || 'No detailed description logged.'}</p>
              <hr />
              <div className="row g-3 small">
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
                  <strong>Daily Rate Budget Max:</strong> ${selectedReq.maxHourlyRate || 50}/hr
                </div>
                <div className="col-sm-6">
                  <strong>Start Date Target:</strong> {selectedReq.startDate}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Specifications</Button>
        </Modal.Footer>
      </Modal>

      {/* Submit Candidate Modal */}
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Submit Profile to Job</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {submitReq && (
            <div>
              <div className="mb-3">
                <span className="text-muted text-xs">Role Target</span>
                <h5 className="fw-bold text-slate-800">{submitReq.title}</h5>
              </div>

              <Form.Group className="mb-3" controlId="selectCandidate">
                <Form.Label className="uppercase-label">Select Available Candidate</Form.Label>
                <Form.Select 
                  value={selectedCandId}
                  onChange={(e) => setSelectedCandId(e.target.value)}
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.skills} &bull; {c.experience} yrs)</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3" controlId="proposedRate">
                <Form.Label className="uppercase-label">Proposed Rate ($/day)</Form.Label>
                <Form.Control 
                  type="number"
                  placeholder="e.g. 450"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleSubmitCandidate} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Profile'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default OpenRequisitions;

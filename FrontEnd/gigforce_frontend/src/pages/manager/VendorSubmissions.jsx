import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Row, Col, Alert, Spinner, Pagination, Offcanvas, Tabs, Tab } from 'react-bootstrap';
import { searchSubmissions, shortlistSubmission, transitionSubmissionToScheduled, selectSubmission, rejectSubmission } from '../../services/vendorSubmissionService';
import { getProfileById, getProfileCerts, getProfileEngagements } from '../../services/contractorService';
import { scheduleInterview } from '../../services/interviewService';
import { getErrorMessage } from '../../services/errorUtils';

function VendorSubmissions() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Submissions data
  const [submissions, setSubmissions] = useState([]);
  const [pageMeta, setPageMeta] = useState({ pageNumber: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(0);

  // Filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Candidate Offcanvas details
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [candidateCerts, setCandidateCerts] = useState([]);
  const [candidateHistory, setCandidateHistory] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Action modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarksType, setRemarksType] = useState('REJECT'); // REJECT or SELECT
  const [remarksText, setRemarksText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Schedule Interview form
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '10:00 AM',
    interviewer: 'Hiring Manager',
  });

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        size: 10,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.requisitionId = searchQuery.trim(); // search by job or requisition
      }

      const data = await searchSubmissions(params);
      setSubmissions(data?.content || []);
      setPageMeta({
        pageNumber: data?.pageable?.pageNumber || 0,
        totalPages: data?.totalPages || 1,
      });

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [currentPage, statusFilter, searchQuery]);

  const loadCandidateDrawer = async (sub) => {
    try {
      setSelectedSub(sub);
      setShowDrawer(true);
      setLoadingProfile(true);
      setCandidateProfile(null);
      setCandidateCerts([]);
      setCandidateHistory([]);

      const profileId = sub.contractorProfileId;
      if (profileId) {
        const [profile, certs, history] = await Promise.all([
          getProfileById(profileId).catch(() => null),
          getProfileCerts(profileId).catch(() => []),
          getProfileEngagements(profileId).catch(() => []),
        ]);
        setCandidateProfile(profile);
        setCandidateCerts(certs || []);
        setCandidateHistory(history || []);
      }
    } catch (err) {
      console.error('Failed to load candidate profile details', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleShortlist = async (id) => {
    try {
      setError('');
      setSuccess('');
      await shortlistSubmission(id);
      setSuccess(`Candidate shortlisted successfully.`);
      loadSubmissions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openScheduleInterview = (sub) => {
    setSelectedSub(sub);
    setScheduleForm({
      date: '',
      time: '10:00 AM',
      interviewer: 'Hiring Manager',
    });
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleForm.date) {
      setError('Date is required for interview scheduling.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      // 1. Backend status update
      await transitionSubmissionToScheduled(selectedSub.id);

      // 2. Simulated scheduler log
      await scheduleInterview({
        candidateName: selectedSub.contractorName || 'Candidate',
        submissionId: selectedSub.id,
        date: scheduleForm.date,
        time: scheduleForm.time,
        interviewer: scheduleForm.interviewer,
      });

      setSuccess(`Interview scheduled for ${selectedSub.contractorName}.`);
      setShowScheduleModal(false);
      loadSubmissions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const openRemarksModal = (sub, type) => {
    setSelectedSub(sub);
    setRemarksType(type);
    setRemarksText('');
    setShowRemarksModal(true);
  };

  const handleRemarksSubmit = async () => {
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      if (remarksType === 'REJECT') {
        await rejectSubmission(selectedSub.id, remarksText);
        setSuccess(`Candidate submission rejected.`);
      } else {
        await selectSubmission(selectedSub.id, remarksText);
        setSuccess(`Candidate selected! Contractor assignment will be initialized.`);
      }

      setShowRemarksModal(false);
      loadSubmissions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Vendor Submissions</h2>
          <p className="text-muted small mt-1 mb-0">Review vendor-proposed talent, manage shortlists, and launch interview loops.</p>
        </div>
        <div>
          <Form.Select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            style={{ width: '200px' }}
          >
            <option value="ALL">All Submissions</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="SELECTED">Selected</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Loading submissions...</p>
        </div>
      ) : (
        <div className="gf-card p-0 border-0">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Submission ID</th>
                  <th>Candidate</th>
                  <th>Job Title / ID</th>
                  <th>Vendor Email</th>
                  <th>Proposed Rate</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="fw-bold">{sub.id}</td>
                      <td>
                        <div className="fw-semibold text-slate-800">{sub.contractorName || 'Contractor'}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{sub.requisitionTitle || 'Job Requisition'}</div>
                        <div className="text-muted style-small" style={{ fontSize: '0.75rem' }}>Req: {sub.requisitionId}</div>
                      </td>
                      <td>{sub.submittedByEmail || 'Vendor Partner'}</td>
                      <td className="text-green-600 fw-bold">${sub.proposedRate}/day</td>
                      <td>
                        <span className={`gf-badge badge-${sub.status.toLowerCase() === 'selected' ? 'approved' : sub.status.toLowerCase() === 'rejected' ? 'rejected' : 'pending'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <Button size="sm" variant="outline-primary" onClick={() => loadCandidateDrawer(sub)}>
                            View Resume
                          </Button>

                          {sub.status === 'SUBMITTED' && (
                            <>
                              <Button size="sm" className="btn-gf-primary" onClick={() => handleShortlist(sub.id)}>
                                Shortlist
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => openRemarksModal(sub, 'REJECT')}>
                                Reject
                              </Button>
                            </>
                          )}

                          {sub.status === 'SHORTLISTED' && (
                            <>
                              <Button size="sm" className="btn-gf-primary" onClick={() => openScheduleInterview(sub)}>
                                Schedule Interview
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => openRemarksModal(sub, 'REJECT')}>
                                Reject
                              </Button>
                            </>
                          )}

                          {sub.status === 'INTERVIEW_SCHEDULED' && (
                            <>
                              <Button size="sm" variant="outline-success" onClick={() => openRemarksModal(sub, 'SELECT')}>
                                Select Candidate
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => openRemarksModal(sub, 'REJECT')}>
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
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No candidate submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {pageMeta.totalPages > 1 && (
            <div className="d-flex justify-content-center p-3">
              <Pagination>
                <Pagination.First onClick={() => setCurrentPage(0)} disabled={currentPage === 0} />
                <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} disabled={currentPage === 0} />
                {[...Array(pageMeta.totalPages)].map((_, i) => (
                  <Pagination.Item key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(pageMeta.totalPages - 1, prev + 1))} disabled={currentPage === pageMeta.totalPages - 1} />
                <Pagination.Last onClick={() => setCurrentPage(pageMeta.totalPages - 1)} disabled={currentPage === pageMeta.totalPages - 1} />
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Candidate Profile Details Drawer */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '500px' }}>
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold text-slate-800">Candidate Profile View</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {loadingProfile ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted small mt-2">Loading candidate profile details...</p>
            </div>
          ) : candidateProfile ? (
            <div>
              {/* Profile Card Summary */}
              <div className="text-center py-3 bg-light rounded mb-4">
                <div className="user-avatar mx-auto mb-2" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                  {candidateProfile.displayName?.substring(0,2).toUpperCase() || 'C'}
                </div>
                <h4 className="fw-bold text-slate-800 mb-0">{candidateProfile.displayName || 'Contractor Profile'}</h4>
                <p className="text-muted small mt-1 mb-0">{candidateProfile.primarySkill || 'Resource Specialist'}</p>
                <span className="gf-badge badge-approved mt-2">{candidateProfile.availabilityStatus}</span>
              </div>

              <Tabs defaultActiveKey="info" id="candidate-tabs" className="mb-3">
                <Tab eventKey="info" title="Personal Info">
                  <div className="d-flex flex-column gap-3 py-2">
                    <div>
                      <div className="small text-muted font-bold text-uppercase">Email</div>
                      <div className="fw-semibold text-slate-800">{candidateProfile.user?.email || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="small text-muted font-bold text-uppercase">Phone</div>
                      <div className="fw-semibold text-slate-800">{candidateProfile.user?.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="small text-muted font-bold text-uppercase">Experience Years</div>
                      <div className="fw-semibold text-slate-800">{candidateProfile.experienceYears} Years</div>
                    </div>
                    <div>
                      <div className="small text-muted font-bold text-uppercase">Hourly Rate</div>
                      <div className="fw-semibold text-green-600">${candidateProfile.hourlyRate}/hr</div>
                    </div>
                    <div>
                      <div className="small text-muted font-bold text-uppercase">Proposed Daily Rate (this SOW)</div>
                      <div className="fw-semibold text-green-600">${selectedSub?.proposedRate}/day</div>
                    </div>
                  </div>
                </Tab>

                <Tab eventKey="certs" title="Certifications">
                  {candidateCerts.length > 0 ? (
                    <div className="d-flex flex-column gap-2 py-2">
                      {candidateCerts.map((cert) => (
                        <div key={cert.id} className="p-2 border rounded bg-light">
                          <div className="fw-bold text-slate-800">{cert.name}</div>
                          <div className="text-muted small mt-1">{cert.issuingAuthority} &bull; Exp: {cert.expiryDate}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small py-3">No certifications logged.</p>
                  )}
                </Tab>

                <Tab eventKey="history" title="Work History">
                  {candidateHistory.length > 0 ? (
                    <div className="d-flex flex-column gap-3 py-2">
                      {candidateHistory.map((hist) => (
                        <div key={hist.id} className="border-start border-3 border-primary ps-3">
                          <div className="fw-bold text-slate-800">{hist.roleTitle}</div>
                          <div className="small text-muted">{hist.clientName} &bull; {hist.startDate} to {hist.endDate || 'Present'}</div>
                          {hist.feedback && <p className="text-muted small italic mt-1 mb-0">&ldquo;{hist.feedback}&rdquo;</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small py-3">No previous placement history verified.</p>
                  )}
                </Tab>
              </Tabs>
            </div>
          ) : (
            <p className="text-muted text-center py-5">Profile details could not be retrieved.</p>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Schedule Interview Modal */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Schedule Interview Slot</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group controlId="intDate">
                  <Form.Label className="uppercase-label">Interview Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="intTime">
                  <Form.Label className="uppercase-label">Interview Time</Form.Label>
                  <Form.Select 
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="intInterviewer">
                  <Form.Label className="uppercase-label">Lead Interviewer</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={scheduleForm.interviewer}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, interviewer: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleScheduleSubmit} disabled={submittingAction}>
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Confirm Interview'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remarks Modal for SELECT or REJECT */}
      <Modal show={showRemarksModal} onHide={() => setShowRemarksModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {remarksType === 'REJECT' ? 'Reject Submission' : 'Select Candidate'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="actionRemarks">
            <Form.Label className="uppercase-label">Provide Review Remarks / Feedback</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              placeholder="Provide comments for this hiring decision..."
              value={remarksText}
              onChange={(e) => setRemarksText(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemarksModal(false)}>Cancel</Button>
          <Button 
            variant={remarksType === 'REJECT' ? 'danger' : 'success'} 
            onClick={handleRemarksSubmit} 
            disabled={submittingAction}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : remarksType === 'REJECT' ? 'Reject Candidate' : 'Select Candidate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default VendorSubmissions;

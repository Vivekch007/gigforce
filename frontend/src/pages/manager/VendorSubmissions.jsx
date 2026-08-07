import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Button, Form, Modal, Row, Col, Alert, Spinner, Pagination, Offcanvas, Tabs, Tab } from 'react-bootstrap';
import { searchSubmissions, shortlistSubmission, transitionSubmissionToScheduled, selectSubmission, rejectSubmission } from '../../services/vendorSubmissionService';
import { getProfileById, getProfileCerts, getProfileEngagements } from '../../services/contractorService';
import { scheduleInterview } from '../../services/interviewService';
import { createAssignment, getAssignments, getAssignmentDetails } from '../../services/assignmentService';
import { getRequisitionDetails } from '../../services/requisitionService';
import { getErrorMessage } from '../../services/errorUtils';

function VendorSubmissions() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Submissions data
  const [submissions, setSubmissions] = useState([]);

  // Enhanced Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageMeta, setPageMeta] = useState({
    pageNumber: 0,
    totalPages: 1,
    totalElements: 0,
    pageSize: 10,
  });

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
    time: '',
    interviewer: '',
  });

  // Create Assignment modal (finalizes a SELECTED submission into an actual Assignment)
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [assignRequisition, setAssignRequisition] = useState(null);
  const [loadingAssignReq, setLoadingAssignReq] = useState(false);
  const [assignForm, setAssignForm] = useState({
    startDate: '',
    endDate: '',
    agreedRatePerDay: '',
    sowReference: '',
  });
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Maps submissionId -> assignmentId for SELECTED submissions that already have
  // an Assignment created, so we can show "View Assignment" instead of the create flow.
  const [assignmentLookup, setAssignmentLookup] = useState({});
  const [showViewAssignmentModal, setShowViewAssignmentModal] = useState(false);
  const [viewAssignmentData, setViewAssignmentData] = useState(null);
  const [loadingViewAssignment, setLoadingViewAssignment] = useState(false);

  // Today's date formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Time slots configuration
  const timeSlots = useMemo(() => [
    { label: '09:00 AM', value: '09:00 AM', hour: 9, minute: 0 },
    { label: '10:00 AM', value: '10:00 AM', hour: 10, minute: 0 },
    { label: '11:30 AM', value: '11:30 AM', hour: 11, minute: 30 },
    { label: '02:00 PM', value: '02:00 PM', hour: 14, minute: 0 },
    { label: '03:30 PM', value: '03:30 PM', hour: 15, minute: 30 },
    { label: '05:00 PM', value: '05:00 PM', hour: 17, minute: 0 },
  ], []);

  // Dynamically filter time slots for today
  const availableTimeSlots = useMemo(() => {
    if (!scheduleForm.date) return timeSlots;

    if (scheduleForm.date !== todayStr) {
      return timeSlots;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // 5 minute grace period

    return timeSlots.filter((slot) => {
      const slotTime = new Date();
      slotTime.setHours(slot.hour, slot.minute, 0, 0);
      return slotTime > now;
    });
  }, [scheduleForm.date, todayStr, timeSlots]);

  // Combine YYYY-MM-DD and time string into a full JS Date object
  const parseDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;

    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;

    const [year, month, day] = parts;

    const slot = timeSlots.find(s => s.value === timeStr);
    let hours = slot ? slot.hour : 0;
    let minutes = slot ? slot.minute : 0;

    if (!slot) {
      const timeParts = timeStr.split(' ');
      if (timeParts.length === 2) {
        const [h, m] = timeParts[0].split(':').map(Number);
        const modifier = timeParts[1];
        hours = h;
        minutes = m;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
      }
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        size: pageSize,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (searchQuery.trim()) {
        params.requisitionId = searchQuery.trim();
      }

      const data = await searchSubmissions(params);
      setSubmissions(data?.content || []);
      setPageMeta({
        pageNumber: data?.pageable?.pageNumber ?? currentPage,
        totalPages: data?.totalPages || 1,
        totalElements: data?.totalElements || 0,
        pageSize: data?.pageable?.pageSize || pageSize,
      });

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [currentPage, pageSize, statusFilter, searchQuery]);

  // For SELECTED submissions on this page, check whether an Assignment already
  // exists for them (contractor+requisition uniquely identifies at most one),
  // so the row can show "View Assignment" instead of the create/finish-setup flow.
  useEffect(() => {
    const toCheck = submissions.filter(
      (sub) => sub.status === 'SELECTED' && !(sub.id in assignmentLookup)
    );
    if (toCheck.length === 0) return;

    let active = true;
    Promise.all(
      toCheck.map((sub) =>
        getAssignments({ requisitionId: sub.requisitionId, contractorProfileId: sub.contractorProfileId, size: 1 })
          .then((data) => ({ subId: sub.id, assignmentId: data?.content?.[0]?.id || null }))
          .catch(() => ({ subId: sub.id, assignmentId: null }))
      )
    ).then((results) => {
      if (!active) return;
      setAssignmentLookup((prev) => {
        const next = { ...prev };
        results.forEach(({ subId, assignmentId }) => { next[subId] = assignmentId; });
        return next;
      });
    });
    return () => { active = false; };
  }, [submissions, assignmentLookup]);

  const openViewAssignmentModal = async (assignmentId) => {
    setShowViewAssignmentModal(true);
    setViewAssignmentData(null);
    try {
      setLoadingViewAssignment(true);
      const data = await getAssignmentDetails(assignmentId);
      setViewAssignmentData(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingViewAssignment(false);
    }
  };

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
      time: '',
      interviewer: '',
    });
    setError('');
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleForm.date) {
      setError('Date is required for interview scheduling.');
      return;
    }

    if (!scheduleForm.time) {
      setError('Please select a valid time slot.');
      return;
    }

    if (!scheduleForm.interviewer.trim()) {
      setError('Interviewer name is required.');
      return;
    }

    const selectedDateTime = parseDateTime(
      scheduleForm.date,
      scheduleForm.time
    );

    const now = new Date();

    if (!selectedDateTime || isNaN(selectedDateTime.getTime())) {
      setError('Invalid date or time format.');
      return;
    }

    if (selectedDateTime <= now) {
      setError('Cannot schedule an interview for a past date or time slot.');
      return;
    }

    const validSlot = availableTimeSlots.some(
      (slot) => slot.value === scheduleForm.time
    );

    if (!validSlot) {
      setError('Selected time slot is no longer available.');
      return;
    }

    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      await transitionSubmissionToScheduled(selectedSub.id);

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

  const openRemarksModal = async (sub, type) => {
    setSelectedSub(sub);
    setRemarksType(type);
    setRemarksText('');
    setError('');
    setShowRemarksModal(true);

    // Hiring a candidate creates the Assignment in the same step - preload the
    // requisition (for its locked engagement type) and the assignment fields.
    if (type === 'SELECT') {
      setAssignForm({
        startDate: '',
        endDate: '',
        agreedRatePerDay: sub.proposedRate || '',
        sowReference: '',
      });
      setAssignRequisition(null);
      try {
        setLoadingAssignReq(true);
        const req = await getRequisitionDetails(sub.requisitionId);
        setAssignRequisition(req);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingAssignReq(false);
      }
    }
  };

  const handleRemarksSubmit = async () => {
    if (remarksType === 'SELECT') {
      if (!assignForm.startDate || !assignForm.endDate) {
        setError('Start date and end date are required to hire this candidate.');
        return;
      }
      if (!assignForm.agreedRatePerDay || parseFloat(assignForm.agreedRatePerDay) <= 0) {
        setError('Agreed daily rate must be a positive number.');
        return;
      }
      if (!assignRequisition?.engagementType) {
        setError('Requisition engagement type could not be loaded. Please retry.');
        return;
      }
    }

    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      if (remarksType === 'REJECT') {
        await rejectSubmission(selectedSub.id, remarksText);
        setSuccess(`Candidate submission rejected.`);
      } else {
        // 1. Mark the submission SELECTED, then 2. create the Assignment from it -
        // hiring the candidate and placing them on the assignment in one action.
        await selectSubmission(selectedSub.id, remarksText);
        await createAssignment({
          vendorSubmissionId: selectedSub.id,
          startDate: assignForm.startDate,
          endDate: assignForm.endDate,
          agreedRatePerDay: parseFloat(assignForm.agreedRatePerDay),
          engagementType: assignRequisition.engagementType,
          sowReference: assignForm.sowReference || undefined,
        });
        setSuccess(`${selectedSub.contractorName} hired and placed on assignment.`);
      }

      setShowRemarksModal(false);
      loadSubmissions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const openCreateAssignmentModal = async (sub) => {
    setSelectedSub(sub);
    setAssignForm({
      startDate: '',
      endDate: '',
      agreedRatePerDay: sub.proposedRate || '',
      sowReference: '',
    });
    setAssignRequisition(null);
    setError('');
    setShowCreateAssignmentModal(true);
    try {
      setLoadingAssignReq(true);
      const req = await getRequisitionDetails(sub.requisitionId);
      setAssignRequisition(req);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingAssignReq(false);
    }
  };

  const handleCreateAssignmentSubmit = async () => {
    if (!assignForm.startDate || !assignForm.endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (!assignForm.agreedRatePerDay || parseFloat(assignForm.agreedRatePerDay) <= 0) {
      setError('Agreed daily rate must be a positive number.');
      return;
    }
    if (!assignRequisition?.engagementType) {
      setError('Requisition engagement type could not be loaded. Please retry.');
      return;
    }

    try {
      setCreatingAssignment(true);
      setError('');
      setSuccess('');

      await createAssignment({
        vendorSubmissionId: selectedSub.id,
        startDate: assignForm.startDate,
        endDate: assignForm.endDate,
        agreedRatePerDay: parseFloat(assignForm.agreedRatePerDay),
        engagementType: assignRequisition.engagementType,
        sowReference: assignForm.sowReference || undefined,
      });

      setSuccess(`Assignment created for ${selectedSub.contractorName}.`);
      setShowCreateAssignmentModal(false);
      loadSubmissions();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingAssignment(false);
    }
  };

  // Helper function to render smart page numbers
  const renderPaginationItems = () => {
    const items = [];
    const total = pageMeta.totalPages;
    const current = currentPage;

    let startPage = Math.max(0, current - 2);
    let endPage = Math.min(total - 1, current + 2);

    if (startPage > 0) {
      items.push(
        <Pagination.Item key={0} onClick={() => setCurrentPage(0)}>
          1
        </Pagination.Item>
      );
      if (startPage > 1) {
        items.push(<Pagination.Ellipsis key="ellipsis-start" disabled />);
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === current}
          onClick={() => setCurrentPage(page)}
        >
          {page + 1}
        </Pagination.Item>
      );
    }

    if (endPage < total - 1) {
      if (endPage < total - 2) {
        items.push(<Pagination.Ellipsis key="ellipsis-end" disabled />);
      }
      items.push(
        <Pagination.Item key={total - 1} onClick={() => setCurrentPage(total - 1)}>
          {total}
        </Pagination.Item>
      );
    }

    return items;
  };

  const firstRecordIndex = pageMeta.totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const lastRecordIndex = Math.min((currentPage + 1) * pageSize, pageMeta.totalElements);

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
                                Hire Candidate
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => openRemarksModal(sub, 'REJECT')}>
                                Reject
                              </Button>
                            </>
                          )}

                          {sub.status === 'SELECTED' && (
                            assignmentLookup[sub.id] ? (
                              <Button size="sm" variant="outline-primary" onClick={() => openViewAssignmentModal(assignmentLookup[sub.id])}>
                                View Assignment
                              </Button>
                            ) : (
                              <Button size="sm" className="btn-gf-primary" onClick={() => openCreateAssignmentModal(sub)}>
                                Finish Assignment Setup
                              </Button>
                            )
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

          {/* Pagination Footer */}
          <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Items per page:</span>
              <Form.Select
                size="sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                style={{ width: '80px' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Form.Select>
              <span className="text-muted small ms-2">
                Showing {firstRecordIndex} - {lastRecordIndex} of {pageMeta.totalElements} entries
              </span>
            </div>

            {pageMeta.totalPages > 1 && (
              <Pagination className="mb-0">
                <Pagination.First
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0}
                />
                <Pagination.Prev
                  onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                />

                {renderPaginationItems()}

                <Pagination.Next
                  onClick={() => setCurrentPage((prev) => Math.min(pageMeta.totalPages - 1, prev + 1))}
                  disabled={currentPage === pageMeta.totalPages - 1}
                />
                <Pagination.Last
                  onClick={() => setCurrentPage(pageMeta.totalPages - 1)}
                  disabled={currentPage === pageMeta.totalPages - 1}
                />
              </Pagination>
            )}
          </div>
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
                    min={todayStr}
                    value={scheduleForm.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setScheduleForm(prev => ({
                        ...prev,
                        date: newDate,
                        time: '',
                      }));
                    }}
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
                    <option value="">Select Time Slot</option>
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No available slots remaining for today
                      </option>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="intInterviewer">
                  <Form.Label className="uppercase-label">Lead Interviewer</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter interviewer name..."
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
          <Button
            className="btn-gf-primary"
            onClick={handleScheduleSubmit}
            disabled={submittingAction || !scheduleForm.date || !scheduleForm.time || !scheduleForm.interviewer.trim() || availableTimeSlots.length === 0}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Confirm Interview'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remarks Modal for REJECT, or full hiring + assignment setup for SELECT */}
      <Modal show={showRemarksModal} onHide={() => setShowRemarksModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {remarksType === 'REJECT' ? 'Reject Submission' : 'Hire Candidate'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          {remarksType === 'SELECT' && selectedSub && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Contractor</span>
                <h6 className="fw-bold text-slate-800 mt-1">{selectedSub.contractorName}</h6>
                <span className="text-muted small">{selectedSub.requisitionTitle || 'Job Requisition'}</span>
              </div>

              {loadingAssignReq ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                </div>
              ) : (
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Group controlId="hireStartDate">
                      <Form.Label className="uppercase-label">Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={assignForm.startDate}
                        onChange={(e) => setAssignForm(prev => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="hireEndDate">
                      <Form.Label className="uppercase-label">End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={assignForm.endDate}
                        onChange={(e) => setAssignForm(prev => ({ ...prev, endDate: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group controlId="hireRate">
                      <Form.Label className="uppercase-label">Agreed Daily Rate (₹)</Form.Label>
                      <Form.Control
                        type="number"
                        value={assignForm.agreedRatePerDay}
                        onChange={(e) => setAssignForm(prev => ({ ...prev, agreedRatePerDay: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group controlId="hireEngagementType">
                      <Form.Label className="uppercase-label">Engagement Type</Form.Label>
                      <Form.Control type="text" value={assignRequisition?.engagementType || ''} disabled readOnly className="bg-light" />
                      <Form.Text className="text-muted">Fixed by the requisition&apos;s engagement type.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group controlId="hireSow">
                      <Form.Label className="uppercase-label">SOW Reference (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g. SOW-2026-0451"
                        value={assignForm.sowReference}
                        onChange={(e) => setAssignForm(prev => ({ ...prev, sowReference: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </div>
          )}

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
            disabled={submittingAction || (remarksType === 'SELECT' && loadingAssignReq)}
          >
            {submittingAction ? <Spinner animation="border" size="sm" /> : remarksType === 'REJECT' ? 'Reject Candidate' : 'Hire & Create Assignment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Fallback: finishes assignment setup for a SELECTED submission whose Assignment wasn't created yet
          (e.g. the hire step's automatic assignment creation failed and needs a retry) */}
      <Modal show={showCreateAssignmentModal} onHide={() => setShowCreateAssignmentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Finish Assignment Setup</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {selectedSub && (
            <div>
              <div className="mb-3">
                <span className="text-muted small">Contractor</span>
                <h6 className="fw-bold text-slate-800 mt-1">{selectedSub.contractorName}</h6>
                <span className="text-muted small">{selectedSub.requisitionTitle || 'Job Requisition'}</span>
              </div>

              {loadingAssignReq ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                </div>
              ) : (
                <Form onSubmit={(e) => e.preventDefault()}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="assignStartDate">
                        <Form.Label className="uppercase-label">Start Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={assignForm.startDate}
                          onChange={(e) => setAssignForm(prev => ({ ...prev, startDate: e.target.value }))}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="assignEndDate">
                        <Form.Label className="uppercase-label">End Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={assignForm.endDate}
                          onChange={(e) => setAssignForm(prev => ({ ...prev, endDate: e.target.value }))}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId="assignRate">
                        <Form.Label className="uppercase-label">Agreed Daily Rate (₹)</Form.Label>
                        <Form.Control
                          type="number"
                          value={assignForm.agreedRatePerDay}
                          onChange={(e) => setAssignForm(prev => ({ ...prev, agreedRatePerDay: e.target.value }))}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId="assignEngagementType">
                        <Form.Label className="uppercase-label">Engagement Type</Form.Label>
                        <Form.Control type="text" value={assignRequisition?.engagementType || ''} disabled readOnly className="bg-light" />
                        <Form.Text className="text-muted">Fixed by the requisition&apos;s engagement type.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId="assignSow">
                        <Form.Label className="uppercase-label">SOW Reference (Optional)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="e.g. SOW-2026-0451"
                          value={assignForm.sowReference}
                          onChange={(e) => setAssignForm(prev => ({ ...prev, sowReference: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateAssignmentModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleCreateAssignmentSubmit} disabled={creatingAssignment || loadingAssignReq}>
            {creatingAssignment ? <Spinner animation="border" size="sm" /> : 'Create Assignment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Assignment Modal - read-only, for a SELECTED submission that already has an Assignment */}
      <Modal show={showViewAssignmentModal} onHide={() => setShowViewAssignmentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Assignment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingViewAssignment ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
            </div>
          ) : viewAssignmentData ? (
            <Row className="g-3 small">
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Assignment ID</span>
                <span className="fw-semibold text-dark">{viewAssignmentData.id}</span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Status</span>
                <span className={`status-pill ${viewAssignmentData.status === 'ACTIVE' || viewAssignmentData.status === 'EXTENDED' ? 'success' : 'secondary'}`}>
                  {viewAssignmentData.status}
                </span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Contractor</span>
                <span className="fw-semibold text-dark">{viewAssignmentData.contractorName}</span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Job Title</span>
                <span className="fw-semibold text-dark">{viewAssignmentData.requisitionTitle || 'Specialist'}</span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Start Date</span>
                <span className="fw-semibold text-dark">{viewAssignmentData.startDate}</span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>End Date</span>
                <span className="fw-semibold text-dark">{viewAssignmentData.endDate}</span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Agreed Daily Rate</span>
                <span className="fw-bold text-success">₹{viewAssignmentData.agreedRatePerDay}/day</span>
              </Col>
              <Col xs={6}>
                <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Engagement Type</span>
                <span className="fw-semibold text-dark">{viewAssignmentData.engagementType}</span>
              </Col>
              {viewAssignmentData.sowReference && (
                <Col xs={12}>
                  <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>SOW Reference</span>
                  <span className="fw-semibold text-dark">{viewAssignmentData.sowReference}</span>
                </Col>
              )}
            </Row>
          ) : (
            <p className="text-muted text-center py-4 mb-0">Assignment details could not be retrieved.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewAssignmentModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default VendorSubmissions;
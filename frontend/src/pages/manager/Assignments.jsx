import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Modal, Row, Col, Alert, Spinner, Pagination, Offcanvas, Card, ProgressBar, Table as BootstrapTable } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, completeAssignment, requestAmendment, getAssignmentAmendments } from '../../services/managerAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useConfirmation } from '../../context/ConfirmationContext';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function Assignments() {
  const { showConfirmation } = useConfirmation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Assignments lists
  const [assignments, setAssignments] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Status Filter & Sorting State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

  // Drawer / Modals
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAsn, setSelectedAsn] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Amendment History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showAmendModal, setShowAmendModal] = useState(false);
  const [amendForm, setAmendForm] = useState({
    amendmentType: 'EXTENSION',
    effectiveDate: '',
    newValue: '',
    reason: 'Project Extension',
    remarks: '',
  });
  const [amendmentsHistory, setAmendmentsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showViewDetailModal, setShowViewDetailModal] = useState(false);
  const [selectedAmendment, setSelectedAmendment] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: 0,
        size: 100, // Fetch broader set to allow seamless client-side filtering, sorting & pagination
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const data = await getAssignments(params);
      setAssignments(data?.content || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [statusFilter]);

  const viewAssignmentDetails = async (asn) => {
    try {
      setSelectedAsn(asn);
      setShowDrawer(true);
      setLoadingDetails(true);
      const details = await getAssignmentDetails(asn.id);
      setSelectedAsn(details);
    } catch (err) {
      console.error('Failed to load assignment details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseAssignment = async (id) => {
    const confirmed = await showConfirmation({ title: 'Close Assignment', message: 'Are you sure you want to close this assignment engagement?' });
    if (!confirmed) return;
    try {
      setError('');
      setSuccess('');
      await completeAssignment(id);
      setSuccess(`Assignment ${id} completed/closed successfully.`);
      setShowDrawer(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const fetchAmendmentsHistory = async (assignmentId) => {
    try {
      setLoadingHistory(true);
      const data = await getAssignmentAmendments(assignmentId);
      setAmendmentsHistory(data || []);
    } catch (err) {
      console.error('Failed to load amendment history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAmendmentTypeChange = (type) => {
    let defaultReason = '';
    if (type === 'EXTENSION') {
      defaultReason = 'Project Extension';
    } else if (type === 'RATE_REVISION') {
      defaultReason = 'Annual Rate Revision';
    } else if (type === 'EARLY_TERMINATION') {
      defaultReason = 'Project Completed';
    }
    setAmendForm(prev => ({
      ...prev,
      amendmentType: type,
      newValue: '',
      reason: defaultReason
    }));
  };

  const openAmendModal = (asn) => {
    setSelectedAsn(asn);
    setAmendForm({
      amendmentType: 'EXTENSION',
      effectiveDate: new Date().toISOString().split('T')[0],
      newValue: '',
      reason: 'Project Extension',
      remarks: '',
    });
    setAmendmentsHistory([]);
    fetchAmendmentsHistory(asn.id);
    setShowAmendModal(true);
  };

  const handleAmendSubmit = async () => {
    if (!amendForm.effectiveDate) {
      setError('Effective Date is required.');
      return;
    }
    if (amendForm.amendmentType === 'EXTENSION' && !amendForm.newValue) {
      setError('New End Date is required.');
      return;
    }
    if (amendForm.amendmentType === 'RATE_REVISION' && !amendForm.newValue) {
      setError('New Agreed Rate is required.');
      return;
    }
    if (!amendForm.reason) {
      setError('Reason is required.');
      return;
    }

    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      const payload = {
        amendmentType: amendForm.amendmentType,
        effectiveDate: amendForm.effectiveDate,
        newValue: amendForm.amendmentType === 'EARLY_TERMINATION' ? amendForm.effectiveDate : amendForm.newValue.toString(),
        reason: amendForm.reason,
        remarks: amendForm.remarks,
      };

      await requestAmendment(selectedAsn.id, payload);

      setSuccess('Assignment amendment submitted successfully.');
      setShowAmendModal(false);
      setShowDrawer(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const getPreviousValueLabel = (am) => {
    if (!am) return '';
    if (am.amendmentType === 'RATE_REVISION') {
      return `₹${Number(selectedAsn?.agreedRatePerDay || 0).toLocaleString('en-IN')}/day`;
    } else {
      return selectedAsn?.endDate || '';
    }
  };

  const getNewValueLabel = (am) => {
    if (!am) return '';
    if (am.amendmentType === 'RATE_REVISION') {
      return `₹${Number(am.newValue || 0).toLocaleString('en-IN')}/day`;
    } else {
      return am.newValue || '';
    }
  };

  // Sorting handler
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Metrics summary calculation
  const metrics = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.status === 'ACTIVE').length;
    const extended = assignments.filter((a) => a.status === 'EXTENDED').length;
    const completed = assignments.filter((a) => a.status === 'COMPLETED').length;

    const monthlySpend = assignments
      .filter((a) => a.status === 'ACTIVE' || a.status === 'EXTENDED')
      .reduce((sum, a) => sum + (Number(a.agreedRatePerDay) || 0) * 22, 0);

    return { total, active, extended, completed, monthlySpend };
  }, [assignments]);

  // Local filter & Column Sorting
  const processedAssignments = useMemo(() => {
    let result = assignments.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (item.contractorName && item.contractorName.toLowerCase().includes(q)) ||
        (item.requisitionTitle && item.requisitionTitle.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
      );
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (typeof valA === 'number' || !isNaN(Number(valA))) {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [assignments, searchQuery, sortConfig]);

  // Pagination Slice Calculations
  const totalPages = Math.ceil(processedAssignments.length / pageSize) || 1;

  const paginatedAssignments = useMemo(() => {
    const start = currentPage * pageSize;
    return processedAssignments.slice(start, start + pageSize);
  }, [processedAssignments, currentPage, pageSize]);

  // Calculate contract tenure progress percentage
  const getContractProgress = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();

    if (now <= start) return 0;
    if (now >= end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="page-title mb-1">Assignments</h1>
          <p className="muted-text">Track active contractor engagements, review statement of work (SOW) terms, and handle extensions.</p>
        </div>
        <div>
          <Form.Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            className="enterprise-form-select"
            style={{ width: '220px' }}
          >
            <option value="ALL">All Assignments</option>
            <option value="ACTIVE">Active</option>
            <option value="EXTENDED">Extended</option>
            <option value="COMPLETED">Completed</option>
            <option value="TERMINATED_EARLY">Terminated Early</option>
            <option value="CANCELLED">Cancelled</option>
          </Form.Select>
        </div>
      </div>



      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="enterprise-alert enterprise-alert-success mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <Loader message="Loading assignment records..." />
      ) : (
        <div>
          {paginatedAssignments.length > 0 ? (
            <Table headers={[
              <span className="cursor-pointer" onClick={() => handleSort('id')}>
                Assignment ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </span>,
              <span className="cursor-pointer" onClick={() => handleSort('contractorName')}>
                Contractor {sortConfig.key === 'contractorName' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </span>,
              'Job Title',
              <span className="cursor-pointer" onClick={() => handleSort('endDate')}>
                Engagement Period {sortConfig.key === 'endDate' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </span>,
              <span className="cursor-pointer" onClick={() => handleSort('agreedRatePerDay')}>
                Agreed Rate {sortConfig.key === 'agreedRatePerDay' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </span>,
              'Status',
              'Actions'
            ]}>
              {paginatedAssignments.map((asn) => (
                <tr key={asn.id}>
                  <td className="fw-bold">{asn.id}</td>
                  <td className="fw-semibold text-dark">{asn.contractorName || 'Contractor'}</td>
                  <td>{asn.requisitionTitle || 'Specialist'}</td>
                  <td className="small">
                    <span className="fw-medium">{asn.startDate}</span> to <span className="fw-medium">{asn.endDate}</span>
                  </td>
                  <td className="text-success fw-bold">₹{asn.agreedRatePerDay}/day</td>
                  <td>
                    <span className={`status-pill ${asn.status.toLowerCase() === 'active' || asn.status.toLowerCase() === 'extended' ? 'success' : 'secondary'}`}>
                      {asn.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2 justify-content-start">
                      <button className="btn-enterprise-secondary py-1 px-3" onClick={() => viewAssignmentDetails(asn)}>
                        View
                      </button>

                      {(asn.status === 'ACTIVE' || asn.status === 'EXTENDED') && (
                        <>
                          <button className="btn-enterprise-primary py-1 px-3" onClick={() => openAmendModal(asn)}>
                            Extend
                          </button>
                          <button className="btn-enterprise-ghost text-danger py-1 px-3 border-0" onClick={() => handleCloseAssignment(asn.id)}>
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="enterprise-table-container p-5 text-center text-muted">
              <i className="bi bi-journal-x fs-2"></i>
              <p className="small mt-2 mb-0">No assignments found matching this criteria.</p>
            </div>
          )}

          {/* Pagination Controls Footer */}
          <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Rows per page:</span>
              <Form.Select
                size="sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(0);
                }}
                style={{ width: '80px' }}
                className="enterprise-form-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Form.Select>
              <span className="text-muted small ms-2">
                Showing {processedAssignments.length === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, processedAssignments.length)} of {processedAssignments.length} entries
              </span>
            </div>

            {totalPages > 1 && (
              <Pagination className="mb-0">
                <Pagination.First onClick={() => setCurrentPage(0)} disabled={currentPage === 0} />
                <Pagination.Prev onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} />
                {[...Array(totalPages)].map((_, idx) => (
                  <Pagination.Item key={idx} active={idx === currentPage} onClick={() => setCurrentPage(idx)}>
                    {idx + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} />
                <Pagination.Last onClick={() => setCurrentPage(totalPages - 1)} disabled={currentPage === totalPages - 1} />
              </Pagination>
            )}
          </div>
        </div>
      )}

      {/* Assignment SOW Details Drawer */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '540px' }} className="enterprise-modal-content">
        <Offcanvas.Header closeButton className="border-bottom enterprise-modal-header">
          <Offcanvas.Title className="fw-bold text-dark">Statement of Work (SOW)</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="enterprise-modal-body">
          {loadingDetails ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted small mt-2">Loading SOW details...</p>
            </div>
          ) : selectedAsn ? (
            <div className="d-flex flex-column gap-3">
              <div className="bg-light p-3 rounded mb-2 d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Contractor</div>
                  <h5 className="fw-bold text-dark mb-0">{selectedAsn.contractorName}</h5>
                  <span className="text-muted small">Assignment Ref: {selectedAsn.id}</span>
                </div>
                <span className={`status-pill ${selectedAsn.status?.toLowerCase() === 'active' || selectedAsn.status?.toLowerCase() === 'extended' ? 'success' : 'secondary'}`}>
                  {selectedAsn.status}
                </span>
              </div>

              {/* Tenure Progress Bar */}
              <div className="p-3 border rounded bg-white">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small font-bold text-uppercase text-muted" style={{ fontSize: '10px' }}>Tenure Completion</span>
                  <span className="small fw-bold text-dark">{getContractProgress(selectedAsn.startDate, selectedAsn.endDate)}%</span>
                </div>
                <ProgressBar now={getContractProgress(selectedAsn.startDate, selectedAsn.endDate)} variant="primary" style={{ height: '8px' }} />
                <div className="d-flex justify-content-between small text-muted mt-1">
                  <span>Start: {selectedAsn.startDate}</span>
                  <span>End: {selectedAsn.endDate}</span>
                </div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Client Account / Org unit</div>
                <div className="fw-semibold text-dark">{selectedAsn.orgUnitId === 'bu1' ? 'Engineering' : 'Corporate'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Role Designation</div>
                <div className="fw-semibold text-dark">{selectedAsn.requisitionTitle || 'Specialist'}</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Agreed Bill Rate</div>
                <div className="fw-bold text-success fs-5">₹{selectedAsn.agreedRatePerDay}/day</div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>SOW reference number</div>
                <div className="fw-mono text-slate-700 bg-light p-2 rounded small mt-1 d-flex justify-content-between align-items-center">
                  <span>{selectedAsn.sowReference || 'SOW-2026-9023-A'}</span>
                  <button className="btn btn-sm btn-link text-decoration-none p-0" onClick={() => setShowHistoryModal(true)}>
                    View History
                  </button>
                </div>
              </div>

              <div>
                <div className="small text-muted font-bold text-uppercase" style={{ fontSize: '10px' }}>Compliance status</div>
                <span className="status-pill success mt-1">COMPLIANT</span>
              </div>

              {/* Drawer Action Bar */}
              {(selectedAsn.status === 'ACTIVE' || selectedAsn.status === 'EXTENDED') && (
                <div className="border-top pt-3 mt-2 d-flex gap-2">
                  <button className="btn-enterprise-primary flex-fill" onClick={() => openAmendModal(selectedAsn)}>
                    Amend Assignment
                  </button>
                  <button className="btn-enterprise-secondary text-danger border-danger" onClick={() => handleCloseAssignment(selectedAsn.id)}>
                    Close Assignment
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-center py-5">No assignment data loaded.</p>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Amend Assignment Modal */}
      <Modal show={showAmendModal} onHide={() => setShowAmendModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Amend Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <Form onSubmit={(e) => e.preventDefault()}>
            {/* Current Assignment Details Read-Only Header */}
            <div className="bg-light p-3 rounded mb-3 border">
              <Row className="g-2 small">
                <Col xs={6}>
                  <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Contractor</span>
                  <span className="fw-semibold text-dark">{selectedAsn?.contractorName}</span>
                </Col>
                <Col xs={6}>
                  <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Job Title</span>
                  <span className="fw-semibold text-dark">{selectedAsn?.requisitionTitle}</span>
                </Col>
                <Col xs={6} className="mt-2">
                  <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Current End Date</span>
                  <span className="fw-semibold text-dark">{selectedAsn?.endDate}</span>
                </Col>
                <Col xs={6} className="mt-2">
                  <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Current Agreed Rate</span>
                  <span className="fw-semibold text-success font-bold">₹{Number(selectedAsn?.agreedRatePerDay || 0).toLocaleString('en-IN')}/day</span>
                </Col>
              </Row>
            </div>

            {/* Amendment Type Dropdown */}
            <Form.Group className="mb-3" controlId="amendmentTypeSelect">
              <Form.Label className="enterprise-form-label">Amendment Type <span className="text-danger">*</span></Form.Label>
              <Form.Select
                value={amendForm.amendmentType}
                onChange={(e) => handleAmendmentTypeChange(e.target.value)}
                className="enterprise-form-select"
                required
              >
                <option value="EXTENSION">Extension</option>
                <option value="RATE_REVISION">Rate Revision</option>
                <option value="EARLY_TERMINATION">Early Termination</option>
              </Form.Select>
            </Form.Group>

            {/* Dynamic Fields */}
            {amendForm.amendmentType === 'EXTENSION' && (
              <Row className="g-3 mb-3">
                <Col md={12}>
                  <Form.Group controlId="extEffDate">
                    <Form.Label className="enterprise-form-label">Effective Date <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={amendForm.effectiveDate}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="enterprise-form-control"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="extNewEnd">
                    <Form.Label className="enterprise-form-label">New End Date <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={amendForm.newValue}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, newValue: e.target.value }))}
                      className="enterprise-form-control"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="extReason">
                    <Form.Label className="enterprise-form-label">Reason <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      value={amendForm.reason}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="enterprise-form-select"
                      required
                    >
                      <option value="Project Extension">Project Extension</option>
                      <option value="Client Request">Client Request</option>
                      <option value="Business Requirement">Business Requirement</option>
                      <option value="Performance Retention">Performance Retention</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}

            {amendForm.amendmentType === 'RATE_REVISION' && (
              <Row className="g-3 mb-3">
                <Col md={12}>
                  <Form.Group controlId="revEffDate">
                    <Form.Label className="enterprise-form-label">Effective Date <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={amendForm.effectiveDate}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="enterprise-form-control"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="revCurrRate">
                    <Form.Label className="enterprise-form-label">Current Agreed Rate (Read Only)</Form.Label>
                    <Form.Control
                      type="text"
                      value={`₹${Number(selectedAsn?.agreedRatePerDay || 0).toLocaleString('en-IN')}/day`}
                      className="enterprise-form-control bg-light"
                      readOnly
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="revNewRate">
                    <Form.Label className="enterprise-form-label">New Agreed Rate <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Enter new daily rate"
                      value={amendForm.newValue}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, newValue: e.target.value }))}
                      className="enterprise-form-control"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="revReason">
                    <Form.Label className="enterprise-form-label">Reason <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      value={amendForm.reason}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="enterprise-form-select"
                      required
                    >
                      <option value="Annual Rate Revision">Annual Rate Revision</option>
                      <option value="Budget Approval">Budget Approval</option>
                      <option value="Performance Increment">Performance Increment</option>
                      <option value="Client Negotiation">Client Negotiation</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}

            {amendForm.amendmentType === 'EARLY_TERMINATION' && (
              <Row className="g-3 mb-3">
                <Col md={12}>
                  <Form.Group controlId="termEffDate">
                    <Form.Label className="enterprise-form-label">Effective Date <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={amendForm.effectiveDate}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="enterprise-form-control"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="termReason">
                    <Form.Label className="enterprise-form-label">Reason <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      value={amendForm.reason}
                      onChange={(e) => setAmendForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="enterprise-form-select"
                      required
                    >
                      <option value="Project Completed">Project Completed</option>
                      <option value="Budget Constraints">Budget Constraints</option>
                      <option value="Contractor Resigned">Contractor Resigned</option>
                      <option value="Performance Issues">Performance Issues</option>
                      <option value="Client Cancellation">Client Cancellation</option>
                      <option value="Mutual Agreement">Mutual Agreement</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Form.Group className="mb-3" controlId="amendRemarks">
              <Form.Label className="enterprise-form-label">Remarks (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Provide justification notes or details..."
                value={amendForm.remarks}
                onChange={(e) => setAmendForm(prev => ({ ...prev, remarks: e.target.value }))}
                className="enterprise-form-control"
              />
            </Form.Group>
          </Form>

          {/* Amendment History Section */}
          <hr />
          <h6 className="fw-bold mb-3 text-slate-800">Previous Amendments ({amendmentsHistory.length})</h6>
          {loadingHistory ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" variant="primary" />
              <p className="text-muted small mt-1">Loading past amendments...</p>
            </div>
          ) : amendmentsHistory.length > 0 ? (
            <div className="table-responsive">
              <BootstrapTable className="table table-sm align-middle small mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {amendmentsHistory.map((am) => (
                    <tr key={am.id}>
                      <td>{am.effectiveDate}</td>
                      <td>{am.amendmentType}</td>
                      <td>
                        <span className={`status-pill ${am.status === 'APPROVED' ? 'success' : am.status === 'PENDING' ? 'pending' : 'danger'}`}>
                          {am.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 text-decoration-none"
                          onClick={() => {
                            setSelectedAmendment(am);
                            setShowViewDetailModal(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </BootstrapTable>
            </div>
          ) : (
            <p className="text-muted small text-center py-2 mb-0">No past amendments recorded.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowAmendModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleAmendSubmit} disabled={submittingAction}>
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Submit'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Amendment View Detail Modal */}
      <Modal show={showViewDetailModal} onHide={() => setShowViewDetailModal(false)} centered className="enterprise-modal-content" style={{ zIndex: 1060 }}>
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Amendment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body bg-light">
          {selectedAmendment && (
            <div className="d-flex flex-column gap-3">
              <Row className="g-2 text-dark">
                <Col xs={6}>
                  <strong>Amendment Type:</strong>
                  <div>{selectedAmendment.amendmentType}</div>
                </Col>
                <Col xs={6}>
                  <strong>Status:</strong>
                  <div>
                    <span className={`status-pill ${selectedAmendment.status === 'APPROVED' ? 'success' : selectedAmendment.status === 'PENDING' ? 'pending' : 'danger'}`}>
                      {selectedAmendment.status}
                    </span>
                  </div>
                </Col>
                <Col xs={6} className="mt-2">
                  <strong>Effective Date:</strong>
                  <div>{selectedAmendment.effectiveDate}</div>
                </Col>
                <Col xs={6} className="mt-2">
                  <strong>Reason:</strong>
                  <div>{selectedAmendment.reason || 'N/A'}</div>
                </Col>

                {selectedAmendment.amendmentType === 'RATE_REVISION' ? (
                  <>
                    <Col xs={6} className="mt-2">
                      <strong>Previous Agreed Rate:</strong>
                      <div>{getPreviousValueLabel(selectedAmendment)}</div>
                    </Col>
                    <Col xs={6} className="mt-2">
                      <strong>New Agreed Rate:</strong>
                      <div>{getNewValueLabel(selectedAmendment)}</div>
                    </Col>
                  </>
                ) : (
                  <>
                    <Col xs={6} className="mt-2">
                      <strong>Previous End Date:</strong>
                      <div>{getPreviousValueLabel(selectedAmendment)}</div>
                    </Col>
                    <Col xs={6} className="mt-2">
                      <strong>New End Date:</strong>
                      <div>{getNewValueLabel(selectedAmendment)}</div>
                    </Col>
                  </>
                )}

                <Col xs={12} className="mt-2">
                  <strong>Approved By:</strong>
                  <div>{selectedAmendment.approvedByName || 'N/A'}</div>
                </Col>
                <Col xs={12} className="mt-2">
                  <strong>Remarks:</strong>
                  <div className="text-muted bg-white p-2 border rounded small">{selectedAmendment.remarks || 'No remarks provided.'}</div>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowViewDetailModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>

      {/* Amendment History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">SOW Amendment Logs ({selectedAsn?.id})</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          {selectedAsn?.amendments && selectedAsn.amendments.length > 0 ? (
            <div className="timeline">
              {selectedAsn.amendments.map((am, idx) => (
                <div key={idx} className="mb-3 p-3 bg-light rounded border-start border-3 border-primary">
                  <div className="fw-bold text-dark">{am.amendmentType || 'EXTENSION'}</div>
                  <div className="small text-muted">Effective Date: {am.effectiveDate}</div>
                  <div className="small text-muted">New Value: {am.newValue}</div>
                  {am.remarks && <p className="small text-dark mb-0 mt-1"><em>"{am.remarks}"</em></p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-4 mb-0">No past amendments recorded for this assignment.</p>
          )}
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowHistoryModal(false)}>Close</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Assignments;
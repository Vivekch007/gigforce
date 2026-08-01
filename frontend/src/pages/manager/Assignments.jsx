import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, Modal, Row, Col, Alert, Spinner, Pagination, Offcanvas, Card, ProgressBar } from 'react-bootstrap';
import { getAssignments, getAssignmentDetails, completeAssignment, requestAmendment } from '../../services/managerAssignmentService';
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

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendForm, setExtendForm] = useState({
    effectiveDate: '',
    newValue: '', // new end date
    remarks: '',
  });
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

  const openExtendModal = (asn) => {
    setSelectedAsn(asn);
    setExtendForm({
      effectiveDate: new Date().toISOString().split('T')[0],
      newValue: '',
      remarks: '',
    });
    setShowExtendModal(true);
  };

  const handleExtendSubmit = async () => {
    if (!extendForm.newValue || !extendForm.effectiveDate) {
      setError('Effective Date and New End Date are required.');
      return;
    }
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      await requestAmendment(selectedAsn.id, {
        amendmentType: 'EXTENSION',
        effectiveDate: extendForm.effectiveDate,
        newValue: extendForm.newValue,
        remarks: extendForm.remarks,
      });

      setSuccess(`Extension request submitted for assignment ${selectedAsn.id}.`);
      setShowExtendModal(false);
      setShowDrawer(false);
      loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
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

      {/* Metric Cards Banner */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'ALL' ? 'border-start border-4 border-primary' : ''}`}
            onClick={() => { setStatusFilter('ALL'); setCurrentPage(0); }}
          >
            <Card.Body className="py-3">
              <div className="text-muted small text-uppercase fw-bold">Total Placements</div>
              <div className="h4 fw-bold text-dark mb-0">{metrics.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'ACTIVE' ? 'border-start border-4 border-success' : ''}`}
            onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(0); }}
          >
            <Card.Body className="py-3">
              <div className="text-muted small text-uppercase fw-bold">Active Engagements</div>
              <div className="h4 fw-bold text-success mb-0">{metrics.active}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card
            className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'EXTENDED' ? 'border-start border-4 border-info' : ''}`}
            onClick={() => { setStatusFilter('EXTENDED'); setCurrentPage(0); }}
          >
            <Card.Body className="py-3">
              <div className="text-muted small text-uppercase fw-bold">Extended</div>
              <div className="h4 fw-bold text-info mb-0">{metrics.extended}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-light">
            <Card.Body className="py-3">
              <div className="text-muted small text-uppercase fw-bold">Est. Monthly Run-Rate</div>
              <div className="h4 fw-bold text-slate-800 mb-0">₹{metrics.monthlySpend.toLocaleString('en-IN')}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                          <button className="btn-enterprise-primary py-1 px-3" onClick={() => openExtendModal(asn)}>
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
                  <button className="btn-enterprise-primary flex-fill" onClick={() => openExtendModal(selectedAsn)}>
                    Extend Engagement
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

      {/* Extend Contract Modal */}
      <Modal show={showExtendModal} onHide={() => setShowExtendModal(false)} centered className="enterprise-modal-content">
        <Modal.Header closeButton className="enterprise-modal-header">
          <Modal.Title className="fw-bold text-dark">Extend Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="enterprise-modal-body">
          <Form onSubmit={(e) => e.preventDefault()}>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group controlId="extEffDate">
                  <Form.Label className="enterprise-form-label">Effective Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={extendForm.effectiveDate}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
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
                    value={extendForm.newValue}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, newValue: e.target.value }))}
                    className="enterprise-form-control"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group controlId="extRemarks">
                  <Form.Label className="enterprise-form-label">Extension Justification / Remarks</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Provide justification notes for extension..."
                    value={extendForm.remarks}
                    onChange={(e) => setExtendForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="enterprise-form-control"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="enterprise-modal-footer">
          <button className="btn-enterprise-secondary" onClick={() => setShowExtendModal(false)}>Cancel</button>
          <button className="btn-enterprise-primary" onClick={handleExtendSubmit} disabled={submittingAction}>
            {submittingAction ? <Spinner animation="border" size="sm" /> : 'Request Extension'}
          </button>
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
import React, { useEffect, useState, useMemo } from 'react';
import { Spinner, Button, Table, Modal, Form, Row, Col, InputGroup, Pagination } from 'react-bootstrap';
import { getAbsences, requestAbsence } from '../../services/contractorService';
import { getAssignments } from '../../services/assignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import '../../styles/contractor.css';

function Absences() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [absences, setAbsences] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED

  const currentDate = new Date();
  const [filterType, setFilterType] = useState('all'); // 'all', 'monthly', 'yearly'
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0 - 11

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    assignmentId: '',
    startDate: '',
    endDate: '',
    absenceType: 'CASUAL_LEAVE',
    duration: 'FULL_DAY',
    reason: '',
  });

  const loadData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError('');

      // Fetch absences list
      const absencesData = await getAbsences();
      const sorted = (absencesData || []).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setAbsences(sorted);

      // Fetch assignments for drop-down selection
      const assignmentsData = await getAssignments();
      const list = assignmentsData?.content || [];
      setAssignments(list);

      if (list.length > 0 && !form.assignmentId) {
        setForm((prev) => ({ ...prev, assignmentId: list[0].id }));
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!form.assignmentId) {
      showToast('Please select an active assignment placement.', 'danger');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await requestAbsence(form);
      setShowModal(false);
      setForm({
        assignmentId: assignments[0]?.id || '',
        startDate: '',
        endDate: '',
        absenceType: 'CASUAL_LEAVE',
        duration: 'FULL_DAY',
        reason: '',
      });
      showToast('Leave request submitted successfully!', 'success');
      loadData(false); // Refresh silently
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate dynamic list of available years from existing records
  const availableYears = useMemo(() => {
    const years = new Set(
      absences
        .map((item) => item.startDate)
        .filter(Boolean)
        .map((dateStr) => new Date(dateStr).getFullYear())
    );
    years.add(new Date().getFullYear()); // Always include current year
    return Array.from(years).sort((a, b) => b - a);
  }, [absences]);

  // Combined Status and Calendar Filtering Logic
  const filteredAbsences = useMemo(() => {
    return absences.filter((ab) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && ab.status !== statusFilter) return false;

      // 2. Date/Calendar Filter
      if (!ab.startDate) return filterType === 'all';

      const itemDate = new Date(ab.startDate);

      if (filterType === 'monthly') {
        return (
          itemDate.getFullYear() === parseInt(selectedYear, 10) &&
          itemDate.getMonth() === parseInt(selectedMonth, 10)
        );
      } else if (filterType === 'yearly') {
        return itemDate.getFullYear() === parseInt(selectedYear, 10);
      }

      return true; // 'all'
    });
  }, [absences, statusFilter, filterType, selectedYear, selectedMonth]);

  // Reset to first page whenever filter rules change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, filterType, selectedYear, selectedMonth]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredAbsences.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedAbsences = filteredAbsences.slice(indexOfFirstItem, indexOfLastItem);

  // Metrics based on full list
  const approvedCasual = absences
    .filter((a) => a.status === 'APPROVED' && a.absenceType === 'CASUAL_LEAVE')
    .reduce((acc, current) => acc + (current.duration === 'HALF_DAY' ? 0.5 : 1), 0);

  const approvedSick = absences
    .filter((a) => a.status === 'APPROVED' && a.absenceType === 'SICK_LEAVE')
    .reduce((acc, current) => acc + (current.duration === 'HALF_DAY' ? 0.5 : 1), 0);

  const pendingRequestsCount = absences.filter((a) => a.status === 'PENDING').length;
  const approvedRequestsCount = absences.filter((a) => a.status === 'APPROVED').length;

  const casualBalance = Math.max(0, 15 - approvedCasual);
  const sickBalance = Math.max(0, 10 - approvedSick);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading absences portal...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Title Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Leave & Absences</h2>
          <p className="text-muted small mt-1 mb-0">Apply for time off and review approval workflows.</p>
        </div>
        <Button className="btn-gf-primary px-4 py-2" onClick={() => setShowModal(true)}>
          Apply Leave
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Casual Leave Balance</span>
              <h3 className="fw-black text-slate-800 mt-1 mb-0">{casualBalance} / 15</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Days remaining this year</p>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Sick Leave Balance</span>
              <h3 className="fw-black text-slate-800 mt-1 mb-0">{sickBalance} / 10</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Medical days remaining</p>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending Approval</span>
              <h3 className="fw-black text-amber-600 mt-1 mb-0">{pendingRequestsCount}</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Requests awaiting review</p>
          </div>
        </div>

        <div className="col-sm-6 col-md-3">
          <div className="gf-card mb-0 p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Approved Placements</span>
              <h3 className="fw-black text-green-600 mt-1 mb-0">{approvedRequestsCount}</h3>
            </div>
            <p className="text-muted small mb-0 mt-2">Days approved by managers</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Status Filter (Left) + Calendar Filter (Right) */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        {/* Status Pills */}
        <div className="d-flex gap-2 overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className={statusFilter === filter ? 'btn-gf-primary' : 'btn-gf-outline border-secondary text-secondary'}
            >
              {filter.charAt(0) + filter.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {/* Date / Calendar Scope Filters */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <InputGroup size="sm" style={{ width: 'auto' }}>
            <InputGroup.Text className="bg-white text-muted border-end-0">
              <i className="bi bi-calendar3"></i>
            </InputGroup.Text>

            {/* Filter Scope */}
            <Form.Select
              size="sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border-start-0 shadow-none fw-semibold"
              style={{ minWidth: '110px' }}
            >
              <option value="all">All Time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Form.Select>
          </InputGroup>

          {/* Conditional Month Selector */}
          {filterType === 'monthly' && (
            <Form.Select
              size="sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="shadow-none fw-semibold"
              style={{ width: '120px' }}
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </Form.Select>
          )}

          {/* Conditional Year Selector */}
          {(filterType === 'monthly' || filterType === 'yearly') && (
            <Form.Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="shadow-none fw-semibold"
              style={{ width: '90px' }}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </Form.Select>
          )}
        </div>
      </div>

      {/* Absences Log Grid */}
      <div className="gf-card p-0 overflow-hidden mb-4">
        {paginatedAbsences.length > 0 ? (
          <>
            <Table responsive hover className="align-middle text-sm mb-0">
              <thead className="bg-light">
                <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: '0.75rem' }}>
                  <th className="p-3">Type</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAbsences.map((ab) => (
                  <tr key={ab.id}>
                    <td className="p-3 fw-bold text-slate-800">{ab.absenceType.replace('_', ' ')}</td>
                    <td className="p-3">{ab.duration.replace('_', ' ')}</td>
                    <td className="p-3">{ab.startDate}</td>
                    <td className="p-3">{ab.endDate}</td>
                    <td className="p-3 text-muted text-truncate" style={{ maxWidth: '250px' }}>{ab.reason}</td>
                    <td className="p-3">
                      <span className={`gf-badge badge-${ab.status.toLowerCase()}`}>
                        {ab.status}
                      </span>
                      {ab.status === 'REJECTED' && ab.rejectionRemarks && (
                        <div className="text-danger small mt-1" style={{ fontSize: '11px', fontWeight: '500' }}>
                          Remarks: {ab.rejectionRemarks}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination Controls Footer */}
            <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2 bg-light">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Show</span>
                <Form.Select
                  size="sm"
                  style={{ width: '70px' }}
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Form.Select>
                <span className="text-muted small">
                  entries | Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAbsences.length)} of {filteredAbsences.length}
                </span>
              </div>

              {totalPages > 1 && (
                <Pagination size="sm" className="mb-0">
                  <Pagination.First
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  />
                  <Pagination.Prev
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  />
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <Pagination.Item
                        key={pageNum}
                        active={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Pagination.Item>
                    );
                  })}
                  <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  />
                  <Pagination.Last
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  />
                </Pagination>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-calendar-x text-muted mb-3" viewBox="0 0 16 16">
              <path d="M6.146 7.146a.5.5 0 0 1 .708 0L8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 0 1 0-.708"/>
              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/>
            </svg>
            <p className="text-muted small mt-2 mb-0">No leave logs match the current filter selection.</p>
          </div>
        )}
      </div>

      {/* Apply Leave Request Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Apply for Leave</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleApplyLeave}>
          <Modal.Body>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Group controlId="leaveAssignment">
                  <Form.Label className="uppercase-label">Assignment Placement</Form.Label>
                  <Form.Select
                    value={form.assignmentId}
                    onChange={(e) => setForm({...form, assignmentId: e.target.value})}
                    required
                  >
                    <option value="">Select placement...</option>
                    {assignments.map((asn) => (
                      <option key={asn.id} value={asn.id}>
                        {asn.requisitionTitle || 'Placement'} ({asn.id})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveStart">
                  <Form.Label className="uppercase-label">Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({...form, startDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveEnd">
                  <Form.Label className="uppercase-label">End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({...form, endDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveType">
                  <Form.Label className="uppercase-label">Leave Type</Form.Label>
                  <Form.Select
                    value={form.absenceType}
                    onChange={(e) => setForm({...form, absenceType: e.target.value})}
                  >
                    <option value="CASUAL_LEAVE">Casual Leave</option>
                    <option value="SICK_LEAVE">Sick Leave</option>
                    <option value="EMERGENCY_LEAVE">Emergency Leave</option>
                    <option value="UNPAID_LEAVE">Unpaid Leave</option>
                    <option value="OTHER">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group controlId="leaveDuration">
                  <Form.Label className="uppercase-label">Duration Basis</Form.Label>
                  <Form.Select
                    value={form.duration}
                    onChange={(e) => setForm({...form, duration: e.target.value})}
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="HALF_DAY">Half Day</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12} className="mb-3">
                <Form.Group controlId="leaveReason">
                  <Form.Label className="uppercase-label">Reason</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.reason}
                    maxLength={250}
                    onChange={(e) => setForm({...form, reason: e.target.value})}
                    placeholder="Provide details / description for manager review..."
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="btn-gf-primary" disabled={actionLoading}>
              {actionLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default Absences;
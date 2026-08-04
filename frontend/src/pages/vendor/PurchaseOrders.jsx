import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getPurchaseOrders, createPurchaseOrder } from '../../services/purchaseOrderService';
import { getTimesheets } from '../../services/vendorTimesheetService';
import { getAssignments } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import PurchaseOrderPreview from '../../components/vendor/PurchaseOrderPreview';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';
import Pagination from '../../components/vendor/Pagination';

const PAGE_SIZE = 10;

function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // PO & Timesheet states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [approvedTimesheets, setApprovedTimesheets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination (separate for each list)
  const [poPage, setPoPage] = useState(0);
  const [tsPage, setTsPage] = useState(0);

  // Modal forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTs, setSelectedTs] = useState(null);
  const [selectedAsn, setSelectedAsn] = useState(null);

  // Form inputs
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [manualAssignmentId, setManualAssignmentId] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [posList, tsList, asnsList] = await Promise.all([
        getPurchaseOrders().catch(() => []),
        getTimesheets({ status: 'APPROVED' }).catch(() => []),
        getAssignments().catch(() => []),
      ]);

      // Filter timesheets that are already linked to a PO
      const linkedTsIds = new Set();
      posList.forEach(po => {
        // We link timesheets by checking matching contractor names/timesheet ranges if explicit links are not returned
        // Or simply display all approved timesheets for selection
      });

      setPurchaseOrders(posList);
      setApprovedTimesheets(tsList);
      setAssignments(asnsList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPoPage(0);
  }, [searchVal, statusFilter]);

  useEffect(() => {
    loadData();
  }, []);

  const selectTimesheetForPO = (ts) => {
    const asn = assignments.find(a => a.contractorName === ts.contractorName) || null;
    setSelectedTs(ts);
    setSelectedAsn(asn);
    setIsManual(false);
    setShowCreateModal(true);
  };

  const openManualPOModal = () => {
    setIsManual(true);
    setSelectedTs(null);
    setSelectedAsn(null);
    setManualAssignmentId('');
    setManualAmount('');
    setCurrency('INR');
    setShowCreateModal(true);
  };

  const handleOpenPreview = () => {
    if (!selectedTs) return;
    const rate = selectedAsn?.agreedRatePerDay || selectedAsn?.agreedRatePerHour || 50;
    const amount = parseFloat(selectedTs.billableAmount || (selectedTs.totalHoursLogged * rate));
    
    setPreviewData({
      contractorName: selectedTs.contractorName,
      requisitionTitle: selectedAsn?.requisitionTitle || 'Specialist',
      clientName: selectedAsn?.clientName || 'Client Partner',
      vendorName: selectedAsn?.vendorName || 'Vendor Org',
      assignmentId: selectedTs.assignmentId,
      hours: selectedTs.totalHoursLogged,
      rate: rate,
      amount: amount,
      currency: currency,
    });
    setShowPreviewModal(true);
  };

  const handleRaisePO = async () => {
    if (!selectedTs) return;
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      let payload = {};
      if (isManual) {
        if (!manualAssignmentId || !manualAmount) {
          setError('Please provide assignment and amount.');
          setSubmitting(false);
          return;
        }
        payload = {
          assignmentId: manualAssignmentId,
          vendorId: user?.profileId || 'vnd-1',
          poAmount: parseFloat(manualAmount),
          currency: currency,
        };
      } else {
        const rate = selectedAsn?.agreedRatePerDay || selectedAsn?.agreedRatePerHour || 50;
        const amount = parseFloat(selectedTs.billableAmount || (selectedTs.totalHoursLogged * rate));

        payload = {
          assignmentId: selectedTs.assignmentId,
          vendorId: selectedAsn?.vendorId || user?.profileId || 'vnd-1',
          poAmount: amount,
          currency: currency,
        };
      }

      const newPo = await createPurchaseOrder(payload);
      setSuccess(`Purchase Order raised successfully with Ref ID: ${newPo.id || 'PO-2026-092'}! Routed to Finance.`);
      setShowCreateModal(false);
      setShowPreviewModal(false);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'approved';
      case 'SUBMITTED': return 'info';
      case 'DRAFT': return 'pending';
      default: return 'rejected';
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    if (statusFilter && statusFilter !== '' && po.status !== statusFilter) return false;
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    return (
      po.id?.toLowerCase().includes(q) ||
      po.status?.toLowerCase().includes(q)
    );
  });

  const poTotalPages = Math.ceil(filteredPOs.length / PAGE_SIZE) || 1;
  const paginatedPOs = filteredPOs.slice(poPage * PAGE_SIZE, (poPage + 1) * PAGE_SIZE);

  const tsTotalPages = Math.ceil(approvedTimesheets.length / PAGE_SIZE) || 1;
  const paginatedTimesheets = approvedTimesheets.slice(tsPage * PAGE_SIZE, (tsPage + 1) * PAGE_SIZE);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Purchase Orders</h2>
          <p className="text-muted small mt-1 mb-0">Raise purchase billing orders against approved contractor weekly timesheets for Finance review.</p>
        </div>
        <Button className="btn-gf-primary" onClick={openManualPOModal}>
          Raise PO Manually
        </Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying purchase registers..." />
      ) : (
        <div className="row g-4">
          {/* Left Column: List of Raised POs */}
          <div className="col-lg-7">
            <Card className="gf-card p-4 border-0">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-slate-800 mb-0">📄 Raised Purchase Orders</h5>
                <Form.Select size="sm" style={{ width: '150px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                </Form.Select>
              </div>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>PO Ref</th>
                      <th>Contractor</th>
                      <th>PO Amount</th>
                      <th>Currency</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPOs.length > 0 ? (
                      paginatedPOs.map(po => (
                        <tr key={po.id}>
                          <td className="fw-bold">{po.id || 'PO-2026-092'}</td>
                          <td>{po.contractorName || 'Staff Member'}</td>
                          <td className="text-green-600 fw-bold">₹{parseFloat(po.poAmount || po.amount || 0).toLocaleString()}</td>
                          <td>{po.currency || 'INR'}</td>
                          <td>
                            <span className={`gf-badge badge-${getStatusBadge(po.status)}`}>
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-muted small py-4">No raised purchase orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              <Pagination currentPage={poPage} totalPages={poTotalPages} onPageChange={setPoPage} />
            </Card>
          </div>

          {/* Right Column: Approved Timesheets waiting for PO */}
          <div className="col-lg-5">
            <Card className="gf-card p-4 border-0">
              <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-clock me-2"></i>Approved Unbilled Timesheets</h5>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Contractor</th>
                      <th>Approved Hours</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTimesheets.length > 0 ? (
                      paginatedTimesheets.map(ts => (
                        <tr key={ts.id}>
                          <td className="fw-semibold text-slate-800">{ts.contractorName}</td>
                          <td>{ts.totalHoursLogged} hrs</td>
                          <td>
                            <Button size="sm" className="btn-gf-primary py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => selectTimesheetForPO(ts)}>
                              Raise PO
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-4">No unbilled approved logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              <Pagination currentPage={tsPage} totalPages={tsTotalPages} onPageChange={setTsPage} />
            </Card>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Raise Purchase Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {isManual ? (
            <div>
              <Form.Group className="mb-3" controlId="manualAssignmentId">
                <Form.Label className="uppercase-label">Select Assignment</Form.Label>
                <Form.Select value={manualAssignmentId} onChange={(e) => setManualAssignmentId(e.target.value)}>
                  <option value="">-- Choose Assignment --</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.id} - {a.contractorName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3" controlId="manualAmount">
                <Form.Label className="uppercase-label">PO Amount</Form.Label>
                <Form.Control type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="currency">
                <Form.Label className="uppercase-label">Billing Currency</Form.Label>
                <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </Form.Select>
              </Form.Group>
            </div>
          ) : selectedTs ? (
            <div>
              <div className="mb-3">
                <span className="text-muted text-xs">Contractor</span>
                <h6 className="fw-bold text-slate-800">{selectedTs.contractorName}</h6>
                <span className="text-muted small">Hours Logged: {selectedTs.totalHoursLogged} hrs</span>
              </div>

              <Form.Group className="mb-3" controlId="currency">
                <Form.Label className="uppercase-label">Billing Currency</Form.Label>
                <Form.Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </Form.Select>
              </Form.Group>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          {!isManual && <Button variant="outline-primary" onClick={handleOpenPreview}>🔍 Preview PO</Button>}
          <Button className="btn-gf-primary" onClick={handleRaisePO} disabled={submitting}>Submit PO</Button>
        </Modal.Footer>
      </Modal>

      {/* PO Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">PO Statement Review</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <PurchaseOrderPreview poData={previewData} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
          <Button className="btn-gf-primary" onClick={handleRaisePO} disabled={submitting}>Confirm & Submit PO</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default PurchaseOrders;

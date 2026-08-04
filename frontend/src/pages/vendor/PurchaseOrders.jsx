import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getPurchaseOrders, createPurchaseOrder } from '../../services/purchaseOrderService';
import { getAssignments } from '../../services/vendorAssignmentService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import PurchaseOrderPreview from '../../components/vendor/PurchaseOrderPreview';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';
import Pagination from '../../components/vendor/Pagination';

const PO_BUFFER_DAYS = 20;

// PO amount = (full assignment duration + buffer days) x agreed day-rate. Not user-editable.
function calculatePoAmount(assignment) {
  if (!assignment?.startDate || !assignment?.endDate || !assignment?.agreedRatePerDay) return 0;
  const start = new Date(assignment.startDate);
  const end = new Date(assignment.endDate);
  const durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1 + PO_BUFFER_DAYS;
  return durationDays * parseFloat(assignment.agreedRatePerDay);
}

function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // PO & Assignment states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  // Dynamic Pagination States
  const [poPage, setPoPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modal form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAsn, setSelectedAsn] = useState(null);
  const [manualAssignmentId, setManualAssignmentId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [posList, asnsList] = await Promise.all([
        getPurchaseOrders().catch(() => []),
        getAssignments().catch(() => []),
      ]);

      setPurchaseOrders(posList);
      setAssignments(asnsList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPoPage(0);
  }, [searchVal, statusFilter, pageSize]);

  useEffect(() => {
    loadData();
  }, []);

  // Only assignments with no PO already raised against them are eligible.
  const unassignedAssignments = assignments.filter(
    a => !a.poId && !a.POID && (a.status === 'ACTIVE' || a.status === 'EXTENDED' || a.Status === 'ACTIVE' || a.Status === 'EXTENDED')
  );

  const openManualPOModal = () => {
    setSelectedAsn(null);
    setManualAssignmentId('');
    setCurrency('INR');
    setShowCreateModal(true);
  };

  const handleAssignmentSelect = (assignmentId) => {
    setManualAssignmentId(assignmentId);
    const asn = unassignedAssignments.find(a => (a.id || a.AssignmentID) === assignmentId) || null;
    setSelectedAsn(asn);
  };

  const handleOpenPreview = () => {
    if (!selectedAsn) return;
    const amount = calculatePoAmount(selectedAsn);

    setPreviewData({
      contractorName: selectedAsn.contractorName,
      requisitionTitle: selectedAsn.requisitionTitle || 'Specialist',
      clientName: selectedAsn.clientName || 'Client Partner',
      vendorName: selectedAsn.vendorName || 'Vendor Org',
      assignmentId: selectedAsn.id || selectedAsn.AssignmentID,
      startDate: selectedAsn.startDate,
      endDate: selectedAsn.endDate,
      rate: selectedAsn.agreedRatePerDay,
      amount: amount,
      currency: currency,
    });
    setShowPreviewModal(true);
  };

  const handleRaisePO = async () => {
    if (!selectedAsn) {
      setError('Please select an assignment.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        assignmentId: selectedAsn.id || selectedAsn.AssignmentID,
        vendorId: user?.profileId || selectedAsn.VendorID || 'vnd-1',
        poAmount: calculatePoAmount(selectedAsn),
        currency: currency,
      };

      const newPo = await createPurchaseOrder(payload);
      const newPoId = newPo?.POID || newPo?.id || 'New PO';
      setSuccess(`Purchase Order raised successfully with Ref ID: ${newPoId}! Routed to Finance.`);
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
      case 'APPROVED':
      case 'ACTIVE': return 'approved';
      case 'SUBMITTED': return 'info';
      case 'DRAFT': return 'pending';
      default: return 'rejected';
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const poStatus = po.Status || po.status || '';
    const poId = po.POID || po.id || '';
    const assignmentId = po.AssignmentID || po.assignmentId || '';
    const contractor = po.contractorName || '';

    if (statusFilter && statusFilter !== '' && poStatus.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (!searchVal.trim()) return true;

    const q = searchVal.trim().toLowerCase();
    return (
      poId.toLowerCase().includes(q) ||
      assignmentId.toLowerCase().includes(q) ||
      poStatus.toLowerCase().includes(q) ||
      contractor.toLowerCase().includes(q)
    );
  });

  const poTotalPages = Math.ceil(filteredPOs.length / pageSize) || 1;
  const paginatedPOs = filteredPOs.slice(poPage * pageSize, (poPage + 1) * pageSize);

  const previewAmount = selectedAsn ? calculatePoAmount(selectedAsn) : 0;

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Purchase Orders</h2>
          <p className="text-muted small mt-1 mb-0">Raise a purchase order covering the full assignment duration for Finance review.</p>
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
        <Card className="gf-card p-4 border-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold text-slate-800 mb-0">📄 Raised Purchase Orders</h5>

            {/* Status Filter Dropdown */}
            <Form.Select size="sm" style={{ width: '150px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
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
                  <th>Assignment ID</th>
                  <th>Contractor</th>
                  <th>PO Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPOs.length > 0 ? (
                  paginatedPOs.map(po => {
                    const poRef = po.POID || po.id;
                    const assignmentId = po.AssignmentID || po.assignmentId || 'N/A';
                    const contractor = po.contractorName || 'N/A';
                    const rawAmount = po.POAmount ?? po.poAmount ?? po.amount ?? 0;
                    const poCurrency = po.Currency || po.currency || 'INR';
                    const currentStatus = po.Status || po.status || 'N/A';

                    return (
                      <tr key={poRef}>
                        <td className="fw-bold">{poRef}</td>
                        <td className="fw-semibold text-slate-700">{assignmentId}</td>
                        <td>{contractor}</td>
                        <td className="text-green-600 fw-bold">
                          {poCurrency === 'INR' ? '₹' : poCurrency === 'USD' ? '$' : '€'}
                          {parseFloat(rawAmount).toLocaleString()}
                        </td>
                        <td>{poCurrency}</td>
                        <td>
                          <span className={`gf-badge badge-${getStatusBadge(currentStatus)}`}>
                            {currentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted small py-4">No raised purchase orders found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {/* Bottom Footer Controls */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            {/* Bottom-Left Controls: Page Size Dropdown Beside Status Text */}
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small text-nowrap">Show:</span>
                <Form.Select
                  size="sm"
                  style={{ width: '75px' }}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Form.Select>
              </div>

              <span className="text-muted small">
                Showing {filteredPOs.length > 0 ? poPage * pageSize + 1 : 0} to {Math.min((poPage + 1) * pageSize, filteredPOs.length)} of {filteredPOs.length} entries
              </span>
            </div>

            {/* Bottom-Right Controls: Pagination Buttons */}
            <Pagination currentPage={poPage} totalPages={poTotalPages} onPageChange={setPoPage} />
          </div>
        </Card>
      )}

      {/* Create PO Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Raise Purchase Order</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3" controlId="manualAssignmentId">
            <Form.Label className="uppercase-label">Select Assignment</Form.Label>
            <Form.Select value={manualAssignmentId} onChange={(e) => handleAssignmentSelect(e.target.value)}>
              <option value="">-- Choose Assignment --</option>
              {unassignedAssignments.map(a => {
                const id = a.AssignmentID || a.id;
                return (
                  <option key={id} value={id}>
                    {id} - {a.contractorName}
                  </option>
                );
              })}
            </Form.Select>
            {unassignedAssignments.length === 0 && (
              <Form.Text className="text-muted">All active assignments already have a Purchase Order raised.</Form.Text>
            )}
          </Form.Group>

          {selectedAsn && (
            <>
              <div className="mb-3 small text-muted">
                Duration: {selectedAsn.startDate} to {selectedAsn.endDate} + {PO_BUFFER_DAYS} day buffer, at ₹{selectedAsn.agreedRatePerDay}/day
              </div>
              <Form.Group className="mb-3" controlId="poAmount">
                <Form.Label className="uppercase-label">PO Amount (auto-calculated)</Form.Label>
                <Form.Control type="text" value={`₹${previewAmount.toLocaleString()}`} disabled readOnly />
              </Form.Group>
            </>
          )}

          <Form.Group className="mb-3" controlId="currency">
            <Form.Label className="uppercase-label">Billing Currency</Form.Label>
            <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="outline-primary" onClick={handleOpenPreview} disabled={!selectedAsn}>🔍 Preview PO</Button>
          <Button className="btn-gf-primary" onClick={handleRaisePO} disabled={submitting || !selectedAsn}>Submit PO</Button>
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
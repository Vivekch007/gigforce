import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getPurchaseOrders } from '../../services/financePurchaseOrderService';
import { createInvoice } from '../../services/invoiceService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function PurchaseOrders() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // POs list
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Generate Invoice Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  
  // Invoice form fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // Role check
  const isFinanceManager = user?.role === 'FINANCE';

  const loadPOs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPurchaseOrders();
      setPurchaseOrders(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  const handleReviewPO = (poId) => {
    // Simulated PO review transition
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        return { ...po, status: 'UNDER_REVIEW' };
      }
      return po;
    }));
    setSuccess(`Purchase Order ${poId} marked as Under Review.`);
  };

  const openGenerateInvoiceModal = (po) => {
    setSelectedPo(po);
    // Auto-generate invoice number
    setInvoiceNumber(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setTaxAmount('0');
    setShowGenerateModal(true);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceNumber.trim()) {
      setError('Please input an invoice number.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        purchaseOrderId: selectedPo.id,
        assignmentId: selectedPo.assignmentId,
        invoiceNumber: invoiceNumber,
        billingStartDate: selectedPo.billingStartDate || new Date().toISOString().split('T')[0],
        billingEndDate: selectedPo.billingEndDate || new Date().toISOString().split('T')[0],
        totalRegularHours: selectedPo.approvedHours || 40,
        totalOvertimeHours: 0,
        taxAmount: parseFloat(taxAmount || 0),
      };

      await createInvoice(payload);
      
      // Update local state to mark PO status as "Invoice Generated"
      setPurchaseOrders(prev => prev.map(po => {
        if (po.id === selectedPo.id) {
          return { ...po, status: 'Invoice Generated' };
        }
        return po;
      }));

      setSuccess(`Invoice ${invoiceNumber} successfully generated for PO ${selectedPo.id}!`);
      setShowGenerateModal(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'INVOICE GENERATED': return 'approved';
      case 'COMPLETED': return 'approved';
      case 'UNDER_REVIEW': return 'pending';
      case 'SUBMITTED': return 'info';
      default: return 'rejected';
    }
  };

  // Local Search & Role Filtering
  const filteredPOs = purchaseOrders.filter(po => {
    // 1. Search Query filter
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      if (!po.id?.toLowerCase().includes(q) && !po.contractorName?.toLowerCase().includes(q)) {
        return false;
      }
    }
    // 2. Role-based queue limits (for FINANCE role, simulate showing only assigned POs)
    if (!isFinanceManager) {
      // Simulate assignment: standard FINANCE user sees only items assigned to their email
      const assignedEmail = (po.id && po.id.charCodeAt(po.id.length - 1) % 2 === 0) 
        ? 'finance@gigforce.com' 
        : 'other_finance@gigforce.com';
      return assignedEmail === (user?.email || 'finance@gigforce.com');
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Purchase Orders</h2>
        <p className="text-muted small mt-1 mb-0">Review staffing purchase orders submitted by vendors to generate billing invoices.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Searching purchase records..." />
      ) : filteredPOs.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>PO Number</th>
                  <th>Contractor</th>
                  <th>Client</th>
                  <th>Approved Hours</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map(po => (
                  <tr key={po.id}>
                    <td className="fw-bold">{po.id}</td>
                    <td>{po.contractorName || 'Contractor'}</td>
                    <td>{po.clientName || 'Partner Client'}</td>
                    <td>{po.approvedHours || po.hours || 40} hrs</td>
                    <td className="text-green-600 fw-bold">${parseFloat(po.poAmount || po.amount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        {po.status === 'SUBMITTED' && (
                          <Button size="sm" variant="outline-secondary" onClick={() => handleReviewPO(po.id)}>
                            Review PO
                          </Button>
                        )}
                        {(po.status === 'SUBMITTED' || po.status === 'UNDER_REVIEW') && (
                          <Button size="sm" className="btn-gf-primary" onClick={() => openGenerateInvoiceModal(po)}>
                            Generate Invoice
                          </Button>
                        )}
                        {po.status === 'Invoice Generated' && (
                          <span className="text-muted small align-self-center py-1">Processed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">📋</span>
          <p className="text-muted small mt-2 mb-0">No purchase orders available for review.</p>
        </div>
      )}

      {/* Generate Invoice Modal */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Generate Contractor Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedPo && (
            <div>
              <div className="mb-3 p-3 bg-light rounded">
                <div className="small text-muted text-uppercase font-bold">Purchase Order Ref</div>
                <div className="fw-bold text-slate-800 mb-2">{selectedPo.id}</div>
                <div className="small text-muted text-uppercase font-bold">PO Amount</div>
                <div className="fw-black text-green-600">${parseFloat(selectedPo.poAmount || selectedPo.amount || 0).toLocaleString()}</div>
              </div>

              <Form.Group className="mb-3" controlId="invNumber">
                <Form.Label className="uppercase-label">Invoice Number</Form.Label>
                <Form.Control 
                  type="text"
                  required
                  placeholder="e.g. INV-2026-1029"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="tax">
                <Form.Label className="uppercase-label">Tax / GST Amount ($)</Form.Label>
                <Form.Control 
                  type="number"
                  placeholder="e.g. 50"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleGenerateInvoice} disabled={submitting}>
            {submitting ? 'Generating...' : 'Confirm Generate'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default PurchaseOrders;

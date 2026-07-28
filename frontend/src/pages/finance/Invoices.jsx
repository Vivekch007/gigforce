import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getInvoices, approveInvoice, rejectInvoice } from '../../services/invoiceService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import InvoicePreview from '../../components/finance/InvoicePreview';
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function Invoices() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invoices list
  const [invoices, setInvoices] = useState([]);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Role check
  const isFinanceManager = user?.role === 'FINANCE';

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getInvoices();
      setInvoices(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleReview = (invId) => {
    // Simulated Review transition
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        return { ...inv, status: 'UNDER_REVIEW' };
      }
      return inv;
    }));
    setSuccess(`Invoice ${invId} marked as Under Review.`);
  };

  const handleApprove = async (invId) => {
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');
      
      await approveInvoice(invId);
      setSuccess(`Invoice ${invId} approved successfully!`);
      setShowPreviewModal(false);
      loadInvoices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (invId) => {
    try {
      setSubmittingAction(true);
      setError('');
      setSuccess('');

      await rejectInvoice(invId);
      setSuccess(`Invoice ${invId} rejected.`);
      setShowPreviewModal(false);
      loadInvoices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleMarkReady = (invId) => {
    // Simulated transition to READY_FOR_PAYMENT
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invId) {
        return { ...inv, status: 'READY_FOR_PAYMENT' };
      }
      return inv;
    }));
    setSuccess(`Invoice ${invId} marked as Ready for Payment.`);
    setShowPreviewModal(false);
  };

  const openPreview = (inv) => {
    setSelectedInv(inv);
    setShowPreviewModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return 'approved';
      case 'READY FOR PAYMENT': return 'approved';
      case 'READY_FOR_PAYMENT': return 'approved';
      case 'APPROVED': return 'approved';
      case 'UNDER_REVIEW': return 'pending';
      case 'GENERATED': return 'info';
      case 'SUBMITTED': return 'info';
      default: return 'rejected';
    }
  };

  // Local Search & Role Filtering
  const filteredInvoices = invoices.filter(inv => {
    // 1. Search Query filter
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      if (!inv.invoiceNumber?.toLowerCase().includes(q) && !inv.contractorName?.toLowerCase().includes(q)) {
        return false;
      }
    }
    // 2. Role-based view limits (standard FINANCE role sees only assigned invoices)
    if (!isFinanceManager) {
      // Simulate assignment: standard FINANCE user sees only items assigned to their email
      const assignedEmail = (inv.id && inv.id.charCodeAt(inv.id.length - 1) % 2 === 0) 
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
        <h2 className="fw-black text-slate-800 mb-0">Invoices</h2>
        <p className="text-muted small mt-1 mb-0">Review contractor invoices, audit billing items, and authorize disbursements.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Searching invoices ledger..." />
      ) : filteredInvoices.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Invoice Number</th>
                  <th>Purchase Order</th>
                  <th>Contractor</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="fw-bold">{inv.invoiceNumber}</td>
                    <td>{inv.purchaseOrderId || 'PO-2026-081'}</td>
                    <td>{inv.contractorName || 'Contractor'}</td>
                    <td>{inv.billingEndDate || 'End Target'}</td>
                    <td className="text-green-600 fw-bold">${parseFloat(inv.invoiceAmount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => openPreview(inv)}>
                          View Details
                        </Button>
                        {inv.status === 'GENERATED' && (
                          <Button size="sm" variant="outline-secondary" onClick={() => handleReview(inv.id)}>
                            Review
                          </Button>
                        )}
                        {(inv.status === 'UNDER_REVIEW' || inv.status === 'SUBMITTED') && (
                          <>
                            <Button size="sm" variant="success" onClick={() => handleApprove(inv.id)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleReject(inv.id)}>
                              Reject
                            </Button>
                          </>
                        )}
                        {inv.status === 'APPROVED' && (
                          <Button size="sm" className="btn-gf-primary" onClick={() => handleMarkReady(inv.id)}>
                            Ready for Payment
                          </Button>
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
          <span className="fs-1">💵</span>
          <p className="text-muted small mt-2 mb-0">No invoices logged for approval.</p>
        </div>
      )}

      {/* Invoice Details Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Invoice Statement Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <InvoicePreview invoice={selectedInv} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
          {selectedInv && (selectedInv.status === 'UNDER_REVIEW' || selectedInv.status === 'SUBMITTED') && (
            <>
              <Button variant="danger" onClick={() => handleReject(selectedInv.id)} disabled={submittingAction}>Reject Invoice</Button>
              <Button variant="success" onClick={() => handleApprove(selectedInv.id)} disabled={submittingAction}>Approve Invoice</Button>
            </>
          )}
          {selectedInv && selectedInv.status === 'APPROVED' && (
            <Button className="btn-gf-primary" onClick={() => handleMarkReady(selectedInv.id)}>Mark Ready for Payment</Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Invoices;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getPayments, createPayment, processPayment, failPayment } from '../../services/paymentService';
import { getInvoices } from '../../services/invoiceService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import PaymentDialog from '../../components/finance/PaymentDialog';
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function Payments() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payments list
  const [payments, setPayments] = useState([]);

  // Invoices ready for payment list (to trigger process payment)
  const [readyInvoices, setReadyInvoices] = useState([]);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Role check
  const isFinanceManager = user?.role === 'FINANCE';

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [paymentsList, invoicesList] = await Promise.all([
        getPayments().catch(() => []),
        getInvoices().catch(() => []),
      ]);

      // Filter invoices ready for payment (status APPROVED or READY_FOR_PAYMENT)
      const ready = invoicesList.filter(inv => inv.status === 'APPROVED' || inv.status === 'READY_FOR_PAYMENT');
      
      setPayments(paymentsList);
      setReadyInvoices(ready);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProcessPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (payload) => {
    try {
      setSubmittingPayment(true);
      setError('');
      setSuccess('');

      // 1. Create the payment record (registers as PENDING)
      const newPayment = await createPayment({
        invoiceId: payload.invoiceId,
        paidAmount: payload.paidAmount,
        paymentDate: payload.paymentDate,
        paymentMode: payload.paymentMode,
      });

      // Temporarily insert as PROCESSING to simulate banking clearing queue
      setPayments(prev => [
        { ...newPayment, status: 'PROCESSING', paymentMode: payload.paymentMode },
        ...prev
      ]);

      // Simulate bank network clearance lag
      await new Promise(resolve => setTimeout(resolve, 1200));

      // 2. Process/succeed the payment (transitions status to PAID, generates txn ref)
      await processPayment(newPayment.id);

      setSuccess(`Invoice ${selectedInvoice.invoiceNumber} paid successfully! Settlement Ref ID: ${newPayment.id || 'PAY-TEMP'}.`);
      setShowPaymentModal(false);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
      loadData();
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleFailPayment = async (id) => {
    try {
      setError('');
      setSuccess('');
      await failPayment(id);
      setSuccess(`Payment ${id} marked as Failed.`);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return 'approved';
      case 'PROCESSING': return 'pending';
      case 'PENDING': return 'info';
      default: return 'rejected';
    }
  };

  // Local Search & Role Filtering
  const filteredPayments = payments.filter(p => {
    // 1. Search Query filter
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      if (!p.id?.toLowerCase().includes(q) && !p.status?.toLowerCase().includes(q)) {
        return false;
      }
    }
    // 2. Role-based view limit (standard FINANCE role sees only assigned payments)
    if (!isFinanceManager) {
      // Simulate assignment: standard FINANCE user sees only items assigned to their email
      const assignedEmail = (p.id && p.id.charCodeAt(p.id.length - 1) % 2 === 0) 
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
        <h2 className="fw-black text-slate-800 mb-0">Payments Ledger</h2>
        <p className="text-muted small mt-1 mb-0">Disburse funds, record corporate ACH/Wire transactions, and reconcile bank settlements.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying transaction accounts..." />
      ) : (
        <div className="row g-4">
          {/* Left Column: List of Processed Payments */}
          <div className="col-lg-7">
            <Card className="gf-card p-4 border-0 bg-white">
              <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-credit-card me-2"></i>Processed Payments</h5>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Payment ID</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Status</th>
                      {isFinanceManager && <th className="text-end">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map(p => (
                        <tr key={p.id}>
                          <td className="fw-bold">{p.id}</td>
                          <td className="text-green-600 fw-bold">₹{parseFloat(p.paidAmount || 0).toLocaleString()}</td>
                          <td>{p.paymentMode}</td>
                          <td>{p.paymentDate}</td>
                          <td>
                            <span className={`gf-badge badge-${getStatusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          {isFinanceManager && (
                            <td className="text-end">
                              {p.status === 'PENDING' && (
                                <Button size="sm" variant="outline-danger" onClick={() => handleFailPayment(p.id)}>
                                  Mark Fail
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center text-muted small py-4">No payment transfers processed yet.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>

          {/* Right Column: Invoices Ready for Payment */}
          <div className="col-lg-5">
            <Card className="gf-card p-4 border-0 bg-white">
              <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-cash-stack me-2"></i>Invoices Ready for Settlement</h5>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Invoice Ref</th>
                      <th>Amount</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyInvoices.length > 0 ? (
                      readyInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="fw-bold">{inv.invoiceNumber}</td>
                          <td className="text-green-600 fw-bold">₹{parseFloat(inv.invoiceAmount).toLocaleString()}</td>
                          <td>
                            <Button size="sm" className="btn-gf-primary py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => openProcessPaymentModal(inv)}>
                              Pay Now
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-4">No pending approved invoices waiting for pay-out.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Payment Processing Dialog */}
      <PaymentDialog
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        onSubmit={handleProcessPayment}
        invoice={selectedInvoice}
      />
    </div>
  );
}

export default Payments;

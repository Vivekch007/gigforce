import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert } from 'react-bootstrap';
import { getPayments, updatePayment, processPayment, failPayment } from '../../services/paymentService';
import { getInvoices } from '../../services/invoiceService';
import { getPurchaseOrders } from '../../services/financePurchaseOrderService';
import { getAssignmentDetails } from '../../services/assignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { formatINR } from '../../utils/currency';

// Reusable components
import PaymentDialog from '../../components/finance/PaymentDialog';
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function Payments() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Pay Now dialog
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [dialogData, setDialogData] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [paymentsList, invoicesList, posList] = await Promise.all([
        getPayments().catch(() => []),
        getInvoices().catch(() => []),
        getPurchaseOrders().catch(() => []),
      ]);

      setPayments(paymentsList);
      setInvoices(invoicesList);
      setPurchaseOrders(posList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const invoicesById = Object.fromEntries(invoices.map(inv => [inv.id, inv]));
  // PurchaseOrderResponseDTO serializes with @JsonProperty overrides - the real key is POID, not id.
  const posByPOID = Object.fromEntries(purchaseOrders.map(po => [po.POID, po]));

  const pendingPayments = payments.filter(p => p.Status === 'PENDING');

  const filteredPendingPayments = pendingPayments.filter(p => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    const invoice = invoicesById[p.InvoiceID];
    return (
      p.PaymentID?.toLowerCase().includes(q) ||
      p.Status?.toLowerCase().includes(q) ||
      invoice?.assignmentId?.toLowerCase().includes(q) ||
      invoice?.contractorName?.toLowerCase().includes(q)
    );
  });

  const openPayNow = async (payment) => {
    const invoice = invoicesById[payment.InvoiceID] || null;
    const po = invoice?.poId ? posByPOID[invoice.poId] || null : null;
    let assignment = null;
    try {
      if (invoice?.assignmentId) {
        assignment = await getAssignmentDetails(invoice.assignmentId);
      }
    } catch (err) {
      // Non-fatal: the dialog falls back to the PO's HR name, or a placeholder.
    }
    setDialogData({ payment, invoice, po, assignment });
    setShowPaymentModal(true);
  };

  const handlePayNow = async ({ id, paymentMode, paymentDate }) => {
    try {
      setSubmittingPayment(true);
      setError('');
      setSuccess('');

      await updatePayment(id, { paymentMode, paymentDate });
      await processPayment(id);

      setSuccess(`Payment ${id} processed successfully.`);
      setShowPaymentModal(false);
      setDialogData(null);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
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

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Payments Gate</h2>
        <p className="text-muted small mt-1 mb-0">Review invoices ready for settlement and release contractor payments.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying transaction accounts..." />
      ) : (
        <Card className="gf-card p-4 border-0 bg-white">
          <h5 className="fw-bold mb-3 text-slate-800"><i className="bi bi-cash-stack me-2"></i>Invoices Ready for Settlement</h5>
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Assignment ID</th>
                  <th>Invoice Ref</th>
                  <th>Contractor</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingPayments.length > 0 ? (
                  filteredPendingPayments.map(p => {
                    const invoice = invoicesById[p.InvoiceID];
                    return (
                      <tr key={p.PaymentID}>
                        <td className="fw-bold">{invoice?.assignmentId ?? '-'}</td>
                        <td>{invoice?.invoiceNumber ?? p.InvoiceID}</td>
                        <td>{invoice?.contractorName ?? '-'}</td>
                        <td className="text-green-600 fw-bold">{formatINR(p.PaidAmount)}</td>
                        <td>{p.PaymentDate}</td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end">
                            <Button size="sm" className="btn-gf-primary py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => openPayNow(p)}>
                              Pay Now
                            </Button>
                            <Button size="sm" variant="outline-danger" className="py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => handleFailPayment(p.PaymentID)}>
                              Fail
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted small py-4">No invoices are currently pending settlement.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Payment Processing Dialog */}
      <PaymentDialog
        show={showPaymentModal}
        onHide={() => { setShowPaymentModal(false); setDialogData(null); }}
        onSubmit={handlePayNow}
        payment={dialogData?.payment}
        invoice={dialogData?.invoice}
        po={dialogData?.po}
        assignment={dialogData?.assignment}
        submitting={submittingPayment}
      />
    </div>
  );
}

export default Payments;

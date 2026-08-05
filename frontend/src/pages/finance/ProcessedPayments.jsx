import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Alert } from 'react-bootstrap';
import { getPayments } from '../../services/paymentService';
import { getInvoices } from '../../services/invoiceService';
import { getPurchaseOrders } from '../../services/financePurchaseOrderService';
import { getErrorMessage } from '../../services/errorUtils';
import { formatINR } from '../../utils/currency';

import FinanceTable from '../../components/finance/FinanceTable';
import Pagination from '../../components/finance/Pagination';
import LoadingSpinner from '../../components/finance/LoadingSpinner';
import EmptyState from '../../components/finance/EmptyState';

const PAGE_SIZE = 10;

function ProcessedPayments() {
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [page, setPage] = useState(0);

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

  useEffect(() => {
    setPage(0);
  }, [searchVal]);

  const invoicesById = Object.fromEntries(invoices.map(inv => [inv.id, inv]));
  // PurchaseOrderResponseDTO serializes with @JsonProperty overrides - the real key is POID, not id.
  const posByPOID = Object.fromEntries(purchaseOrders.map(po => [po.POID, po]));

  const processedPayments = payments.filter(p => p.Status === 'PROCESSED' || p.Status === 'FAILED');

  const filtered = processedPayments.filter(p => {
    if (!searchVal.trim()) return true;
    const q = searchVal.trim().toLowerCase();
    const invoice = invoicesById[p.InvoiceID];
    return (
      p.PaymentID?.toLowerCase().includes(q) ||
      p.Status?.toLowerCase().includes(q) ||
      invoice?.assignmentId?.toLowerCase().includes(q) ||
      invoice?.contractorName?.toLowerCase().includes(q) ||
      invoice?.invoiceNumber?.toLowerCase().includes(q)
    );
  });

  // Most recently processed first.
  const sorted = [...filtered].sort((a, b) => (b.PaymentDate || '').localeCompare(a.PaymentDate || ''));

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSED': return 'approved';
      case 'FAILED': return 'rejected';
      default: return 'pending';
    }
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Processed Payments</h2>
        <p className="text-muted small mt-1 mb-0">Full settlement history — every payment that has been processed or failed.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Loading payment history..." />
      ) : sorted.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <FinanceTable headers={['Contractor', 'Assignment ID', 'Invoice Ref', 'PO Ref', 'Amount', 'Reference', 'Status', 'Date']}>
            {paged.map(p => {
              const invoice = invoicesById[p.InvoiceID];
              const po = invoice?.poId ? posByPOID[invoice.poId] : null;
              return (
                <tr key={p.PaymentID}>
                  <td>{invoice?.contractorName ?? '-'}</td>
                  <td>{invoice?.assignmentId ?? '-'}</td>
                  <td className="fw-bold">{invoice?.invoiceNumber ?? p.InvoiceID}</td>
                  <td>{po?.POID ?? '-'}</td>
                  <td className="text-green-600 fw-bold">{formatINR(p.PaidAmount)}</td>
                  <td>{p.PaymentReference || p.TransactionID || '-'}</td>
                  <td>
                    <span className={`gf-badge badge-${getStatusBadge(p.Status)}`}>{p.Status}</span>
                  </td>
                  <td>{p.PaymentDate}</td>
                </tr>
              );
            })}
          </FinanceTable>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      ) : (
        <EmptyState icon="bi bi-journal-check" message="No payments have been processed yet." />
      )}
    </div>
  );
}

export default ProcessedPayments;

import React, { useEffect, useState } from 'react';
import { Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { getInvoices, previewMonthlyInvoices, generateMonthlyInvoices } from '../../services/invoiceCreationService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import Table from '../../components/Table';
import Loader from '../../components/Loader';

function InvoiceCreation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const [selectedMonthYear, setSelectedMonthYear] = useState('2026-08');
  const [previewStats, setPreviewStats] = useState({ totalTimesheetsProcessed: 0, totalAmountBilled: 0 });
  const [generatedInvoices, setGeneratedInvoices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [yearStr, monthStr] = selectedMonthYear.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const [stats, invoicesData] = await Promise.all([
        previewMonthlyInvoices(year, month).catch(() => ({ totalTimesheetsProcessed: 0, totalAmountBilled: 0 })),
        getInvoices().catch(() => []),
      ]);

      setPreviewStats(stats);
      setGeneratedInvoices(invoicesData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonthYear]);

  const handleGenerateInvoice = async () => {
    try {
      setSubmitting(true);
      setError('');

      const [yearStr, monthStr] = selectedMonthYear.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const result = await generateMonthlyInvoices(year, month);
      showToast(`Monthly invoice generated successfully! ${result.invoicesGeneratedCount} invoice(s) generated.`, 'success');
      
      // Reload stats and invoice list
      const [stats, invoicesData] = await Promise.all([
        previewMonthlyInvoices(year, month).catch(() => ({ totalTimesheetsProcessed: 0, totalAmountBilled: 0 })),
        getInvoices().catch(() => []),
      ]);
      setPreviewStats(stats);
      setGeneratedInvoices(invoicesData);
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatInvoiceStatus = (status) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return 'warning';
      case 'SUBMITTED':
      case 'FINANCE_REVIEW': return 'pending';
      case 'APPROVED':
      case 'PAID': return 'success';
      default: return 'secondary';
    }
  };

  const formatRupees = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    return `₹ ${formatted}`;
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h1 className="page-title mb-1">Invoice Generate</h1>
        <p className="muted-text">Generate monthly billing invoices for approved contractor timesheets.</p>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}

      {loading ? (
        <Loader message="Loading billing modules..." />
      ) : (
        <>
          {/* Monthly Invoice Generation Control Card */}
          <div className="row g-4 mb-4 justify-content-center">
            <div className="col-lg-6">
              <div className="enterprise-table-container p-5 bg-white text-center" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
                <h4 className="fw-bold mb-4 text-dark"><i className="bi bi-calendar-check me-2 text-primary"></i>Monthly Invoice Generate</h4>
                
                <div className="mb-4 text-start mx-auto" style={{ maxWidth: '320px' }}>
                  <Form.Group controlId="billingMonth">
                    <Form.Label className="fw-bold text-muted small text-uppercase">Billing Month</Form.Label>
                    <Form.Select 
                      value={selectedMonthYear} 
                      onChange={e => setSelectedMonthYear(e.target.value)}
                      className="enterprise-form-control py-2"
                      style={{ fontSize: '1rem' }}
                    >
                      <option value="2026-08">August 2026</option>
                      <option value="2026-07">July 2026</option>
                      <option value="2026-06">June 2026</option>
                      <option value="2026-05">May 2026</option>
                    </Form.Select>
                  </Form.Group>
                </div>

                <hr className="my-4" />

                <div className="d-flex justify-content-between align-items-center mb-3 mx-auto" style={{ maxWidth: '320px' }}>
                  <span className="text-muted fw-semibold">Approved Timesheets</span>
                  <span className="fw-bold text-dark fs-5">{previewStats.totalTimesheetsProcessed || 0}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4 mx-auto" style={{ maxWidth: '320px' }}>
                  <span className="text-muted fw-semibold">Estimated Amount</span>
                  <span className="fw-black text-success fs-4">{formatRupees(previewStats.totalAmountBilled || 0)}</span>
                </div>

                <hr className="my-4" />

                <div className="mx-auto" style={{ maxWidth: '320px' }}>
                  <button 
                    className="btn-enterprise-primary w-100 py-3 fw-bold fs-6" 
                    onClick={handleGenerateInvoice}
                    disabled={submitting || (previewStats.totalTimesheetsProcessed || 0) === 0}
                  >
                    {submitting ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Generating...
                      </>
                    ) : (
                      'Generate Invoice'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Generated Invoices */}
          <div className="row">
            <div className="col-12">
              <div className="enterprise-table-container p-4 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
                <h5 className="fw-bold mb-3 text-dark"><i className="bi bi-file-earmark-text me-2"></i>Generated Invoices</h5>
                <Table headers={['Invoice Details', 'Billing Period', 'Contractor', 'Amount (₹)', 'Status']}>
                  {generatedInvoices.length > 0 ? (
                    generatedInvoices.map(inv => {
                      const issued = inv.invoiceDate || 'Pending';
                      let due = 'Pending';
                      if (inv.paymentDate) {
                        due = inv.paymentDate;
                      } else if (inv.invoiceDate) {
                        const d = new Date(inv.invoiceDate);
                        d.setDate(d.getDate() + 30);
                        due = d.toISOString().split('T')[0];
                      }
                      return (
                        <tr key={inv.id}>
                          <td>
                            <div className="fw-bold text-dark">{inv.invoiceNumber || inv.id}</div>
                            <div className="small text-muted mt-1">Issue: {issued} &bull; Due: {due}</div>
                          </td>
                          <td className="small">{inv.billingStartDate} to {inv.billingEndDate}</td>
                          <td>
                            <div className="fw-semibold text-dark">{inv.contractorName || 'Contractor'}</div>
                          </td>
                          <td className="text-success fw-bold">{formatRupees(inv.totalAmount || inv.invoiceAmount || 0)}</td>
                          <td>
                            <span className={`status-pill ${formatInvoiceStatus(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="text-center py-5 text-muted">
                          <i className="bi bi-file-earmark fs-1 text-muted"></i>
                          <p className="mb-0 fw-medium mt-2">No generated invoices found.</p>
                          <p className="small text-muted">Generate invoices above to view list here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InvoiceCreation;

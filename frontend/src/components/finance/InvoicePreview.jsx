import React from 'react';
import { Row, Col, Table } from 'react-bootstrap';

function InvoicePreview({ invoice }) {
  if (!invoice) return null;
  const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-';
  const billingStart = invoice.billingStartDate ? new Date(invoice.billingStartDate).toLocaleDateString() : '-';
  const billingEnd = invoice.billingEndDate ? new Date(invoice.billingEndDate).toLocaleDateString() : '-';
  const totalRegularHours = invoice.totalRegularHours ?? '-';
  const totalOvertimeHours = invoice.totalOvertimeHours ?? '-';
  const taxAmount = (invoice.taxAmount === 0 || invoice.taxAmount) ? invoice.taxAmount : '-';
  const amountNum = Number(invoice.invoiceAmount);
  const formattedAmount = Number.isFinite(amountNum) ? `₹${amountNum.toLocaleString()}` : '-';

  return (
    <div className="border p-4 rounded bg-white">
      <div className="d-flex justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-black text-primary mb-0">INVOICE STATEMENT</h4>
          <span className="text-muted small">GigForce Workforce Solutions</span>
        </div>
        <div className="text-end">
          <h5 className="fw-bold text-slate-700">No: {invoice.id ?? '-'}</h5>
          <span className="text-muted small">Date: {invoiceDate}</span>
        </div>
      </div>

      <Row className="mb-4 small">
        <Col sm={6}>
          <div className="text-muted font-bold">CLIENT DEPT:</div>
{/*           <div className="fw-bold text-slate-800">{invoice.clientName ?? '-'}</div> */}
          <div className="text-muted">PO Ref: {invoice.poId ?? '-'}</div>
        </Col>
        <Col sm={6} className="text-sm-end">
          <div className="text-muted font-bold">VENDOR DETAILS:</div>
          <div className="fw-bold text-slate-800">{invoice.vendorName ?? '-'}</div>
          <div className="text-muted">{invoice.vendorId ?? '-'}</div>
        </Col>
      </Row>

      <Table bordered size="sm" className="mb-4 small text-center">
        <thead className="table-light">
          <tr>
            <th>Item Scope</th>
            <th>Billing Period</th>
            <th>Regular Hours</th>
            <th>Overtime Hours</th>
            <th>Tax Amount</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
              <td className="text-start">
                <strong>{invoice.contractorName ?? '-'}</strong> &mdash; Staffing Services
              </td>
              <td>{billingStart} to {billingEnd}</td>
              <td>{totalRegularHours} {typeof totalRegularHours === 'number' ? 'hrs' : ''}</td>
              <td>{totalOvertimeHours} {typeof totalOvertimeHours === 'number' ? 'hrs' : ''}</td>
              <td>{taxAmount === '-' ? '-' : `₹${taxAmount}`}</td>
              <td className="text-green-600 fw-bold">{formattedAmount}</td>
          </tr>
        </tbody>
      </Table>

      <div className="d-flex justify-content-end mb-2">
        <div className="text-end">
          <span className="text-muted font-bold small text-uppercase">Total Due:</span>
          <h4 className="fw-black text-green-600 mt-1 mb-0">₹{parseFloat(invoice.invoiceAmount || 0).toLocaleString()}</h4>
        </div>
      </div>
    </div>
  );
}

export default InvoicePreview;

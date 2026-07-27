import React from 'react';
import { Row, Col, Table } from 'react-bootstrap';

function InvoicePreview({ invoice }) {
  if (!invoice) return null;
  return (
    <div className="border p-4 rounded bg-white">
      <div className="d-flex justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-black text-primary mb-0">INVOICE STATEMENT</h4>
          <span className="text-muted small">GigForce Workforce Solutions</span>
        </div>
        <div className="text-end">
          <h5 className="fw-bold text-slate-700">No: {invoice.invoiceNumber || 'INV-TEMP-PREVIEW'}</h5>
          <span className="text-muted small">Date: {invoice.invoiceDate || new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <Row className="mb-4 small">
        <Col sm={6}>
          <div className="text-muted font-bold">CLIENT DEPT:</div>
          <div className="fw-bold text-slate-800">{invoice.clientName || 'Internal Department'}</div>
          <div className="text-muted">PO Ref: {invoice.purchaseOrderId || 'N/A'}</div>
        </Col>
        <Col sm={6} className="text-sm-end">
          <div className="text-muted font-bold">VENDOR DETAILS:</div>
          <div className="fw-bold text-slate-800">{invoice.vendorName || 'Staffing Partner'}</div>
          <div className="text-muted">{invoice.vendorEmail || 'billing@partner.com'}</div>
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
              <strong>{invoice.contractorName || 'Contractor'}</strong> &mdash; Staffing Services
            </td>
            <td>{invoice.billingStartDate} to {invoice.billingEndDate}</td>
            <td>{invoice.totalRegularHours || 40} hrs</td>
            <td>{invoice.totalOvertimeHours || 0} hrs</td>
            <td>${invoice.taxAmount || 0}</td>
            <td className="text-green-600 fw-bold">${parseFloat(invoice.invoiceAmount || 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </Table>

      <div className="d-flex justify-content-end mb-2">
        <div className="text-end">
          <span className="text-muted font-bold small text-uppercase">Total Due:</span>
          <h4 className="fw-black text-green-600 mt-1 mb-0">${parseFloat(invoice.invoiceAmount || 0).toLocaleString()}</h4>
        </div>
      </div>
    </div>
  );
}

export default InvoicePreview;

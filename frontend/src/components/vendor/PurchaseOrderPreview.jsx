import React from 'react';
import { Row, Col, Table } from 'react-bootstrap';

function PurchaseOrderPreview({ poData }) {
  if (!poData) return null;
  return (
    <div className="border p-4 rounded bg-white">
      <div className="d-flex justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-black text-primary mb-0">PURCHASE ORDER</h4>
          <span className="text-muted small">Vendor Staffing Services</span>
        </div>
        <div className="text-end">
          <h5 className="fw-bold text-slate-700">Ref: {poData.id || 'Generated on submission'}</h5>
          <span className="text-muted small">Date: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <Row className="mb-4 small">
        <Col sm={6}>
          <div className="text-muted font-bold">ISSUED BY (VENDOR):</div>
          <div className="fw-bold text-slate-800">{poData.vendorName || 'Vendor Org'}</div>
        </Col>
        <Col sm={6} className="text-sm-end">
          <div className="text-muted font-bold">ISSUED TO (CLIENT):</div>
          <div className="fw-bold text-slate-800">{poData.clientName || 'Client Org'}</div>
          <div className="text-muted">Placement Ref: {poData.assignmentId}</div>
        </Col>
      </Row>

      <Table bordered size="sm" className="mb-4 small text-center">
        <thead className="table-light">
          <tr>
            <th>Item Scope</th>
            <th>Billing Hours</th>
            <th>Agreed Rate</th>
            <th>Amount Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-start">
              <strong>{poData.contractorName}</strong> &mdash; Staffing Services
            </td>
            <td>{poData.hours} hrs</td>
            <td>${poData.rate}/hr</td>
            <td className="text-green-600 fw-bold">${parseFloat(poData.amount).toLocaleString()}</td>
          </tr>
        </tbody>
      </Table>

      <div className="d-flex justify-content-end mb-2">
        <div className="text-end">
          <span className="text-muted font-bold small text-uppercase">Total Amount:</span>
          <h4 className="fw-black text-green-600 mt-1 mb-0">${parseFloat(poData.amount).toLocaleString()} ({poData.currency || 'USD'})</h4>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderPreview;

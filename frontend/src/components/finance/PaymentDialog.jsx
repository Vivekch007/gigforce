import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

function PaymentDialog({ show, onHide, onSubmit, invoice }) {
  const [paymentMode, setPaymentMode] = useState('ACH');
  const [bankReference, setBankReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!bankReference.trim()) return;

    onSubmit({
      invoiceId: invoice.id,
      paidAmount: parseFloat(invoice.invoiceAmount),
      paymentDate: paymentDate,
      paymentMode: paymentMode,
      bankReference: bankReference,
      remarks: remarks,
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold text-slate-800">Process Invoice Payment</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {invoice && (
          <Form onSubmit={handleSubmit}>
            <div className="mb-3 p-3 bg-light rounded">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted font-bold text-uppercase">Total Amount Due</span>
                <span className="fw-black text-green-600 fs-5">${parseFloat(invoice.invoiceAmount).toLocaleString()}</span>
              </div>
              <span className="text-muted text-xs d-block mt-1">Invoice: {invoice.invoiceNumber} &bull; Vendor: {invoice.vendorName}</span>
            </div>

            <Form.Group className="mb-3" controlId="paymentMode">
              <Form.Label className="uppercase-label">Payment Method</Form.Label>
              <Form.Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="ACH">ACH Transfer</option>
                <option value="WIRE">Wire Transfer</option>
                <option value="CARD">Corporate Credit Card</option>
                <option value="CHECK">Check Disbursement</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="bankReference">
              <Form.Label className="uppercase-label">Bank Transaction Reference ID / Txn ID</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. TXN-94829-RECONCIL"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
              />
              <Form.Text className="text-muted" style={{ fontSize: '0.65rem' }}>Enter transaction hash for banking reconciliation audits.</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="paymentDate">
              <Form.Label className="uppercase-label">Payment Processing Date</Form.Label>
              <Form.Control 
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="remarks">
              <Form.Label className="uppercase-label">Remarks / Ledger Notes</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                placeholder="e.g. Cleared via corporate Chase ledger."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={onHide}>Cancel</Button>
              <Button className="btn-gf-primary" type="submit">Submit Settlement</Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default PaymentDialog;

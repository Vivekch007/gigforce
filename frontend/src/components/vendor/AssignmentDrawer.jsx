import React from 'react';
import { Offcanvas, Row, Col } from 'react-bootstrap';

function AssignmentDrawer({ show, onHide, assignment }) {
  if (!assignment) return null;
  return (
    <Offcanvas show={show} onHide={onHide} placement="end" style={{ width: '450px' }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="fw-bold text-slate-800">Placement Contract Agreement</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h5 className="fw-black text-slate-900 mb-0">{assignment.contractorName}</h5>
            <span className="text-muted small">{assignment.requisitionTitle || 'Specialist'}</span>
          </div>
          <span className={`gf-badge badge-${assignment.status === 'ACTIVE' ? 'approved' : 'rejected'}`}>
            {assignment.status}
          </span>
        </div>

        <Row className="g-3">
          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Assignment ID</span>
            <div className="fw-semibold text-slate-800">{assignment.id}</div>
          </Col>
          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Purchase Order (PO)</span>
            <div className="fw-semibold text-slate-800">{assignment.poId || 'PO-2026-PENDING'}</div>
          </Col>

          <Col xs={12}><hr className="my-1" /></Col>

          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Client Partner</span>
            <div className="fw-semibold text-slate-800">{assignment.clientName || 'Partner Client'}</div>
          </Col>
          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Vendor Org</span>
            <div className="fw-semibold text-slate-800">{assignment.vendorName || 'Staffing Partner'}</div>
          </Col>

          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Contract Start</span>
            <div className="fw-semibold text-slate-800">{assignment.startDate}</div>
          </Col>
          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Contract End</span>
            <div className="fw-semibold text-slate-800">{assignment.endDate || 'Ongoing'}</div>
          </Col>

          <Col xs={12}><hr className="my-1" /></Col>

          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Hourly/Daily Rate</span>
            <div className="fw-bold text-green-600">${assignment.agreedRatePerDay || assignment.agreedRatePerHour}/day</div>
          </Col>
          <Col xs={6}>
            <span className="small text-muted font-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Total Hours Logged</span>
            <div className="fw-semibold text-slate-800">{assignment.totalHoursApproved || 0} hrs</div>
          </Col>
        </Row>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default AssignmentDrawer;

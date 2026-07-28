import React, { useState } from 'react';
import { Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

function Profile() {
  const { user } = useAuth();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: 'System Administrator',
    email: user?.email || 'admin@gigforce.com',
    phone: '+1 (555) 0001',
    employeeId: 'EMP-00001',
    role: user?.role || 'ADMIN',
    department: 'Information Technology & Infrastructure',
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    setTimeout(() => {
      setSuccess('Profile credentials successfully updated.');
      setEditing(false);
    }, 200);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Admin Profile</h2>
        <p className="text-muted small mt-1 mb-0">Manage security credentials, change personal contact phone, and review designation profiles.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Row className="g-4">
        {/* Left Card */}
        <Col lg={4}>
          <Card className="gf-card text-center p-4 border-0 bg-white">
            <div className="mx-auto mb-3 user-avatar fs-2 fw-black" style={{ width: '80px', height: '80px' }}>
              {formData.name.substring(0, 2).toUpperCase()}
            </div>
            <h5 className="fw-bold text-slate-800 mb-1">{formData.name}</h5>
            <span className="text-muted small">{formData.role}</span>
            <hr />
            <div className="text-start small text-slate-600">
              <div className="mb-2"><strong>Employee ID:</strong> {formData.employeeId}</div>
              <div className="mb-2"><strong>Department:</strong> {formData.department}</div>
              <div><strong>System Scope:</strong> Read/Write Master Catalog</div>
            </div>
          </Card>
        </Col>

        {/* Right Form */}
        <Col lg={8}>
          <Card className="gf-card p-4 border-0 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-slate-800 mb-0">System Credentials</h5>
              {!editing ? (
                <Button variant="outline-primary" onClick={() => setEditing(true)}>Edit Details</Button>
              ) : (
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button className="btn-gf-primary" onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </div>

            <Form onSubmit={handleSave}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="name">
                    <Form.Label className="uppercase-label">Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="email">
                    <Form.Label className="uppercase-label">Personal Email</Form.Label>
                    <Form.Control
                      type="email"
                      disabled={!editing}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="phone">
                    <Form.Label className="uppercase-label">Phone Number</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="empId">
                    <Form.Label className="uppercase-label">Employee ID (Locked)</Form.Label>
                    <Form.Control
                      type="text"
                      disabled
                      value={formData.employeeId}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="dept">
                    <Form.Label className="uppercase-label">Department (Locked)</Form.Label>
                    <Form.Control
                      type="text"
                      disabled
                      value={formData.department}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Profile;

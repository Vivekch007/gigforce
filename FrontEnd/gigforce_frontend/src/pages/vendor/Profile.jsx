import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

function Profile() {
  const { user } = useAuth();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  // Profile fields
  const [formData, setFormData] = useState({
    companyName: 'Global Staffing Partners LLC',
    contactPerson: 'Sarah Jenkins',
    email: 'sarah.j@globalstaffing.com',
    phone: '+1 (555) 0122',
    gstin: '29AAAAA1111A1Z1',
    address: '100 Silicon Valley Blvd, San Jose, CA, 95112',
    bankAccount: '•••• •••• •••• 9845 (Chase Bank)',
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    // Simulate save
    setTimeout(() => {
      setSuccess('Profile updated successfully!');
      setEditing(false);
    }, 200);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Vendor Profile</h2>
        <p className="text-muted small mt-1 mb-0">Manage corporate info, key contacts, GSTIN numbers, and bank account settings.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Row className="g-4">
        {/* Left Side: Summary Card */}
        <Col lg={4}>
          <Card className="gf-card text-center p-4 border-0 bg-white">
            <div className="mx-auto mb-3 user-avatar fs-2 fw-black" style={{ width: '80px', height: '80px' }}>
              {formData.companyName.substring(0, 2).toUpperCase()}
            </div>
            <h5 className="fw-bold text-slate-800 mb-1">{formData.companyName}</h5>
            <span className="text-muted small">Registered Vendor Partner</span>
            <hr />
            <div className="text-start small text-slate-600">
              <div className="mb-2"><strong>Primary Contact:</strong> {formData.contactPerson}</div>
              <div className="mb-2"><strong>Email ID:</strong> {formData.email}</div>
              <div><strong>System Role:</strong> {user?.role || 'VENDOR'}</div>
            </div>
          </Card>
        </Col>

        {/* Right Side: Form details */}
        <Col lg={8}>
          <Card className="gf-card p-4 border-0 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold text-slate-800 mb-0">Corporate Credentials</h5>
              {!editing ? (
                <Button variant="outline-primary" onClick={() => setEditing(true)}>Edit Profile</Button>
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
                  <Form.Group controlId="companyName">
                    <Form.Label className="uppercase-label">Company Name</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="contactPerson">
                    <Form.Label className="uppercase-label">Contact Person</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="email">
                    <Form.Label className="uppercase-label">Corporate Email</Form.Label>
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
                <Col md={12}>
                  <Form.Group controlId="gstin">
                    <Form.Label className="uppercase-label">GSTIN / Tax ID</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="address">
                    <Form.Label className="uppercase-label">Address Line</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="bankAccount">
                    <Form.Label className="uppercase-label">Disbursement Bank Account (Chase)</Form.Label>
                    <Form.Control
                      type="text"
                      disabled={!editing}
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
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

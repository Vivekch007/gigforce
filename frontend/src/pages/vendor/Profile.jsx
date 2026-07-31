import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getCurrentUser, updateUser } from '../../services/userService';
import { getErrorMessage } from '../../services/errorUtils';

function Profile() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState('');

  // Profile fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employeeId: '',
    role: '',
    companyName: 'Global Staffing Partners LLC',
    gstin: '29AAAAA1111A1Z1',
    address: '100 Silicon Valley Blvd, San Jose, CA, 95112',
    bankAccount: '•••• •••• •••• 9845 (Chase Bank)',
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCurrentUser();
      setUserId(data.userId);
      setFormData((prev) => ({
        ...prev,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        employeeId: `${data.userId}`,
        role: data.role || 'VENDOR',
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    const normalizedPhone = formData.phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    try {
      const response = await updateUser(userId, { phone: normalizedPhone });
      setFormData((prev) => ({ ...prev, phone: response.phone }));
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading profile...</span>
      </div>
    );
  }

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
              {formData.name.substring(0, 2).toUpperCase()}
            </div>
            <h5 className="fw-bold text-slate-800 mb-1">{formData.name}</h5>
            <span className="text-muted small">{formData.role}</span>
            <hr />
            <div className="text-start small text-slate-600">
              <div className="mb-2"><strong>Employee ID:</strong> {formData.employeeId}</div>
              <div className="mb-2"><strong>Email ID:</strong> {formData.email}</div>
              <div><strong>System Role:</strong> {formData.role}</div>
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
                  <Button variant="outline-secondary" onClick={() => { setEditing(false); loadProfile(); }}>Cancel</Button>
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
                      disabled
                      value={formData.name}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="employeeId">
                    <Form.Label className="uppercase-label">Employee ID</Form.Label>
                    <Form.Control
                      type="text"
                      disabled
                      value={formData.employeeId}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="email">
                    <Form.Label className="uppercase-label">Corporate Email</Form.Label>
                    <Form.Control
                      type="email"
                      disabled
                      value={formData.email}
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
                      disabled
                      value={formData.gstin}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="address">
                    <Form.Label className="uppercase-label">Address Line</Form.Label>
                    <Form.Control
                      type="text"
                      disabled
                      value={formData.address}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group controlId="bankAccount">
                    <Form.Label className="uppercase-label">Disbursement Bank Account (Chase)</Form.Label>
                    <Form.Control
                      type="text"
                      disabled
                      value={formData.bankAccount}
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

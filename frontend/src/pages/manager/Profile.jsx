import React, { useState, useEffect } from 'react';
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

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employeeId: '',
    role: '',
    department: 'Resource Management & Acquisitions',
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
        role: data.role || 'HIRING_MANAGER',
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
        <h2 className="fw-black text-slate-800 mb-0">Manager Profile</h2>
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
            <span className="text-muted small">Hiring Manager</span>
            <hr />
            <div className="text-start small text-slate-600">
              <div className="mb-2"><strong>Employee ID:</strong> {formData.employeeId}</div>
              <div className="mb-2"><strong>Department:</strong> {formData.department}</div>
              <div><strong>System Scope:</strong> Budget Approvals & Requisitions</div>
            </div>
          </Card>
        </Col>

        {/* Right Form */}
        <Col lg={8}>
          <Card className="gf-card p-4 border-0 bg-white">
            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2 mb-4 admin-profile-header">
              <h5 className="fw-bold text-slate-800 mb-0">System Credentials</h5>
              {!editing ? (
                <Button variant="outline-primary" className="btn-sm px-3 py-1 fw-medium" onClick={() => setEditing(true)}>Edit Details</Button>
              ) : (
                <div className="d-flex align-items-center gap-2 ms-sm-auto">
                  <Button variant="outline-secondary" className="btn-sm px-3 py-1 fw-medium" onClick={() => { setEditing(false); loadProfile(); }}>Cancel</Button>
                  <Button className="btn-gf-primary btn-sm px-3 py-1 fw-medium text-nowrap" onClick={handleSave}>Save Changes</Button>
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
                  <Form.Group controlId="email">
                    <Form.Label className="uppercase-label">Personal Email</Form.Label>
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

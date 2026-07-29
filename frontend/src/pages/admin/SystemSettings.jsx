import React, { useEffect, useState } from 'react';
import { Card, Form, Row, Col, Button, Alert } from 'react-bootstrap';
import { getSystemSettings, updateSystemSettings } from '../../services/systemSettingService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [settings, setSettings] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSystemSettings();
      setSettings(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await updateSystemSettings(settings);
      setSuccess('System configurations successfully updated.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">System Settings</h2>
        <p className="text-muted small mt-1 mb-0">Configure authentication policies, security parameter variables, and general preferences.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying platform configuration variables..." />
      ) : (
        <Form onSubmit={handleSave}>
          <Row className="g-4">
            {/* Authentication security policy */}
            <Col lg={6}>
              <Card className="gf-card p-4 border-0 bg-white h-100">
                <h5 className="fw-bold mb-4 text-slate-800"><i className="bi bi-shield-lock me-2"></i>Authentication & Access Security</h5>
                
                <Form.Group className="mb-3" controlId="pwdPolicy">
                  <Form.Label className="uppercase-label">Minimum Password Policy</Form.Label>
                  <Form.Select 
                    value={settings.passwordPolicy}
                    onChange={(e) => setSettings({ ...settings, passwordPolicy: e.target.value })}
                  >
                    <option value="WEAK">Standard (6 characters)</option>
                    <option value="MEDIUM">Medium (8+ characters, mixed case)</option>
                    <option value="STRONG">Strong (10+ characters, mixed case, number, symbol)</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="timeout">
                  <Form.Label className="uppercase-label">Session Idle Timeout (Minutes)</Form.Label>
                  <Form.Control 
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="mfa">
                  <Form.Check 
                    type="switch"
                    label="Force MFA Authenticator validation globally"
                    checked={settings.mfaEnabled}
                    onChange={(e) => setSettings({ ...settings, mfaEnabled: e.target.checked })}
                  />
                  <Form.Text className="text-muted small">Mandates Google Authenticator setups for all enterprise users login.</Form.Text>
                </Form.Group>
              </Card>
            </Col>

            {/* Notification triggers settings */}
            <Col lg={6}>
              <Card className="gf-card p-4 border-0 bg-white h-100">
                <h5 className="fw-bold mb-4 text-slate-800"><i className="bi bi-bell me-2"></i>Global Notification Toggles</h5>

                <Form.Group className="mb-3" controlId="emailNotif">
                  <Form.Check 
                    type="switch"
                    label="Enable Email notification dispatches"
                    checked={settings.emailEnabled}
                    onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="smsNotif">
                  <Form.Check 
                    type="switch"
                    label="Enable SMS gateways alerts"
                    checked={settings.smsEnabled}
                    onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="pushNotif">
                  <Form.Check 
                    type="switch"
                    label="Enable Browser Push notification logs"
                    checked={settings.pushEnabled}
                    onChange={(e) => setSettings({ ...settings, pushEnabled: e.target.checked })}
                  />
                </Form.Group>
              </Card>
            </Col>

            {/* General parameters */}
            <Col lg={12}>
              <Card className="gf-card p-4 border-0 bg-white">
                <h5 className="fw-bold mb-4 text-slate-800"><i className="bi bi-gear me-2"></i>General Company Branding</h5>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="company">
                      <Form.Label className="uppercase-label">Company / Portal Name</Form.Label>
                      <Form.Control 
                        type="text"
                        value={settings.companyName}
                        onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="timezone">
                      <Form.Label className="uppercase-label">Default Time Zone</Form.Label>
                      <Form.Control 
                        type="text"
                        value={settings.timeZone}
                        onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="dateFmt">
                      <Form.Label className="uppercase-label">Date Format Style</Form.Label>
                      <Form.Control 
                        type="text"
                        value={settings.dateFormat}
                        onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <div className="d-flex justify-content-end mt-4 mb-5">
            <Button className="btn-gf-primary px-4 py-2" type="submit">
              Save configurations
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}

export default SystemSettings;

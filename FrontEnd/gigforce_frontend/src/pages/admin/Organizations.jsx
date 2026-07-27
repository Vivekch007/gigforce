import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getOrganizations, createOrganization, updateOrganization, toggleOrganizationStatus } from '../../services/organizationService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Organizations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Orgs list
  const [orgsList, setOrgsList] = useState([]);

  // Create/Edit Org Modal
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrgs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getOrganizations();
      setOrgsList(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const openCreateModal = () => {
    setEditingOrg(null);
    setName('');
    setCode('');
    setAddress('');
    setContact('');
    setShowModal(true);
  };

  const openEditModal = (org) => {
    setEditingOrg(org);
    setName(org.name);
    setCode(org.code);
    setAddress(org.address);
    setContact(org.contact);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (editingOrg) {
        // Edit flow
        await updateOrganization(editingOrg.id, { name, code, address, contact });
        setSuccess(`Organization ${name} updated successfully!`);
      } else {
        // Create flow
        await createOrganization({ name, code, address, contact });
        setSuccess(`Organization ${name} created successfully!`);
      }

      setShowModal(false);
      loadOrgs();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, nameVal) => {
    try {
      setError('');
      setSuccess('');
      const updated = await toggleOrganizationStatus(id);
      setSuccess(`Organization ${nameVal} status updated to ${updated.status}.`);
      loadOrgs();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getStatusBadge = (status) => {
    return status?.toUpperCase() === 'ACTIVE' ? 'approved' : 'rejected';
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Tenant Organizations</h2>
          <p className="text-muted small mt-1 mb-0">Register partner clients, coordinate vendor agencies, and manage tenant codes.</p>
        </div>
        <Button className="btn-gf-primary" onClick={openCreateModal}>
          🏢 Register Organization
        </Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying corporate registries..." />
      ) : (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact Email</th>
                  <th>Corporate Address</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgsList.map(o => (
                  <tr key={o.id}>
                    <td className="fw-bold">{o.code}</td>
                    <td>{o.name}</td>
                    <td>{o.contact}</td>
                    <td className="text-muted small">{o.address}</td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => openEditModal(o)}>
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant={o.status === 'ACTIVE' ? 'outline-danger' : 'outline-success'} 
                          onClick={() => handleToggleStatus(o.id, o.name)}
                        >
                          {o.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {editingOrg ? 'Edit Organization' : 'Register Corporate Tenant'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="orgName">
              <Form.Label className="uppercase-label">Organization Name</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="orgCode">
              <Form.Label className="uppercase-label">Corporate Code</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. ACME"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="orgContact">
              <Form.Label className="uppercase-label">Billing Contact Email</Form.Label>
              <Form.Control 
                type="email"
                required
                placeholder="e.g. accounts@acme.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="orgAddress">
              <Form.Label className="uppercase-label">Registered Corporate Address</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                placeholder="HQ complete street address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="btn-gf-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Organizations;

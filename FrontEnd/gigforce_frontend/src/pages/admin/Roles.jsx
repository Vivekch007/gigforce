import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getRoles, createRole, updateRolePermissions } from '../../services/roleService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import PermissionMatrix from '../../components/admin/PermissionMatrix';
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Roles() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Roles list
  const [rolesList, setRolesList] = useState([]);

  // Create Role Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Permissions Modal
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState(null);


  const loadRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getRoles();
      setRolesList(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await createRole({
        roleName: newRoleName,
        description: newRoleDesc,
      });

      setSuccess(`Role ${newRoleName.toUpperCase()} successfully created!`);
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      loadRoles();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openPermissionsModal = (roleItem) => {
    setEditingRole(roleItem);
    setSelectedPermissions({ ...roleItem.permissions });
    setShowPermsModal(true);
  };

  const handleTogglePermission = (key, val) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setError('');
      setSuccess('');
      await updateRolePermissions(editingRole.roleName, selectedPermissions);
      setSuccess(`Permissions updated successfully for ${editingRole.roleName}.`);
      setShowPermsModal(false);
      loadRoles();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Roles & System Permissions</h2>
          <p className="text-muted small mt-1 mb-0">Configure role scopes, override permission matrices, and audit user permissions.</p>
        </div>
        <Button className="btn-gf-primary" onClick={() => setShowCreateModal(true)}>
          🔐 Create New Role
        </Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying role database..." />
      ) : (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th className="text-center">Users Assigned</th>
                  <th className="text-center">Permissions Matrix</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rolesList.map(r => (
                  <tr key={r.roleName}>
                    <td className="fw-bold">{r.roleName}</td>
                    <td className="text-slate-600 small" style={{ maxWidth: '300px' }}>{r.description}</td>
                    <td className="text-center fw-bold text-slate-800">{r.usersAssigned}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-1">
                        {Object.entries(r.permissions || {}).map(([key, enabled]) => (
                          <span 
                            key={key} 
                            className={`badge text-xs px-2 py-1 ${enabled ? 'bg-success-subtle text-success' : 'bg-light text-muted'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {key.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-primary" onClick={() => openPermissionsModal(r)}>
                        Edit Permissions
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create Role Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Create New System Role</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreateRole}>
            <Form.Group className="mb-3" controlId="roleName">
              <Form.Label className="uppercase-label">Role Code / Key</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. AUDITOR"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="roleDesc">
              <Form.Label className="uppercase-label">Description</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                placeholder="Describe role responsibility scope..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button className="btn-gf-primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Confirm Create'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Permissions Matrix Modal */}
      <Modal show={showPermsModal} onHide={() => setShowPermsModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            Edit Permissions Matrix: {editingRole?.roleName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {editingRole && selectedPermissions && (
            <div>
              <p className="text-muted small mb-3">Toggle actions permitted for system accounts assigned to the {editingRole.roleName} role group.</p>
              <PermissionMatrix 
                rolePermissions={selectedPermissions}
                onTogglePermission={handleTogglePermission}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPermsModal(false)}>Cancel</Button>
          <Button className="btn-gf-primary" onClick={handleSavePermissions}>Save Permissions</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Roles;

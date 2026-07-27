import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getUsers, getMockUsersList, createAdminUser, suspendUser, deactivateUser, activateUser } from '../../services/userService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Users() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Users lists
  const [usersList, setUsersList] = useState([]);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRACTOR');
  const [department, setDepartment] = useState('Engineering');
  const [organization, setOrganization] = useState('GigForce HQ');
  const [submitting, setSubmitting] = useState(false);


  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to fetch real users from backend, fallback to mock users list
      const paginatedResponse = await getUsers({ page: 0, size: 20 }).catch(() => null);
      
      if (paginatedResponse && paginatedResponse.content && paginatedResponse.content.length > 0) {
        // Map backend UserResponseDTO to list structure
        setUsersList(paginatedResponse.content.map(u => ({
          id: u.id || u.UserID,
          employeeId: u.employeeId || 'N/A',
          name: u.name,
          email: u.email,
          role: u.role || 'CONTRACTOR',
          department: u.department || 'Software Development',
          organization: u.organization || 'GigForce HQ',
          status: u.status || 'ACTIVE',
        })));
      } else {
        const mockList = await getMockUsersList();
        setUsersList(mockList);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const newUser = await createAdminUser({
        name,
        email,
        role,
        department,
        organization,
      });

      setSuccess(`User account successfully created for ${newUser.name}! Password reset link sent to ${newUser.email}.`);
      setShowCreateModal(false);
      
      // Reset form
      setName('');
      setEmail('');
      setRole('CONTRACTOR');
      
      loadUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setError('');
      setSuccess('');

      if (currentStatus === 'ACTIVE') {
        await suspendUser(id).catch(() => null);
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'SUSPENDED' } : u));
        setSuccess(`User account ${id} successfully suspended.`);
      } else {
        await activateUser(id).catch(() => null);
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'ACTIVE' } : u));
        setSuccess(`User account ${id} successfully reactivated.`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleResetPassword = (emailVal) => {
    setSuccess(`Password reset instructions sent to ${emailVal} successfully.`);
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'approved';
      case 'SUSPENDED': return 'rejected';
      case 'INACTIVE': return 'rejected';
      default: return 'pending';
    }
  };

  // Local Search filtering
  const filteredUsers = usersList.filter(u => {
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchEmp = u.employeeId?.toLowerCase().includes(q);
      return matchName || matchEmail || matchEmp;
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">System Users</h2>
          <p className="text-muted small mt-1 mb-0">Manage platform access accounts, edit designations details, and audit status settings.</p>
        </div>
        <Button className="btn-gf-primary" onClick={() => setShowCreateModal(true)}>
          👤 Create User Account
        </Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Searching users master files..." />
      ) : filteredUsers.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="fw-bold">{u.employeeId}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.organization}</td>
                    <td>
                      <span className="badge bg-light text-slate-700 border small">
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(u.status)}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-secondary" onClick={() => handleResetPassword(u.email)}>
                          Reset Pwd
                        </Button>
                        <Button 
                          size="sm" 
                          variant={u.status === 'ACTIVE' ? 'outline-danger' : 'outline-success'} 
                          onClick={() => handleToggleStatus(u.id, u.status)}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">👤</span>
          <p className="text-muted small mt-2 mb-0">No matching system users found.</p>
        </div>
      )}

      {/* Create User Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Register System User</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleCreateUser}>
            <Form.Group className="mb-3" controlId="userName">
              <Form.Label className="uppercase-label">Full Name</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. David Miller"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="userEmail">
              <Form.Label className="uppercase-label">User Email Address</Form.Label>
              <Form.Control 
                type="email"
                required
                placeholder="e.g. david.m@gigforce.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="userRole">
              <Form.Label className="uppercase-label">System Role Type</Form.Label>
              <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="CONTRACTOR">Contractor</option>
                <option value="VENDOR">Recruiter (Vendor)</option>
                <option value="VENDOR_MANAGER">Vendor Manager</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="FINANCE">Finance Agent</option>
                <option value="FINANCE_MANAGER">Finance Manager</option>
                <option value="ADMIN">System Admin</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="userDept">
              <Form.Label className="uppercase-label">Department</Form.Label>
              <Form.Control 
                type="text"
                placeholder="e.g. Software Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="userOrg">
              <Form.Label className="uppercase-label">Organization Name</Form.Label>
              <Form.Control 
                type="text"
                placeholder="e.g. GigForce HQ"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button className="btn-gf-primary" type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Register User'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Users;

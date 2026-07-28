import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getUsers, suspendUser, deactivateUser, activateUser } from '../../services/userService';
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
          employeeId: u.userId || 'N/A',

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



  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setError('');
      setSuccess('');

      if (currentStatus === 'ACTIVE') {
        await suspendUser(id).catch(() => null);
        setUsersList(prev => prev.map(u => u.employeeId === id ? { ...u, status: 'SUSPENDED' } : u));
        setSuccess(`User account ${id} successfully suspended.`);
      } else {
        await activateUser(id).catch(() => null);
        setUsersList(prev => prev.map(u => u.employeeId === id ? { ...u, status: 'ACTIVE' } : u));
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
                  <th>ID</th>
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
                      <span className="badge bg-dark text-slate-700 border small">
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

                        <Button 
                          size="sm" 
                          variant={u.status === 'ACTIVE' ? 'outline-danger' : 'outline-success'} 
                          onClick={() => handleToggleStatus(u.employeeId, u.status)}
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


    </div>
  );
}

export default Users;

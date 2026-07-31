import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Form, Pagination } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getUsers, suspendUser, activateUser } from '../../services/userService';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed for Spring Boot
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Column filters
  const [filterOrg, setFilterOrg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Extract unique options for dropdowns based on current loaded data
  const uniqueOrgs = [...new Set(usersList.map(u => u.organization))].filter(Boolean);
  const uniqueRoles = [...new Set(usersList.map(u => u.role))].filter(Boolean);
  const uniqueStatuses = [...new Set(usersList.map(u => u.status))].filter(Boolean);

  const loadUsers = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError('');

      const paginatedResponse = await getUsers({ page, size });

      if (paginatedResponse && paginatedResponse.content) {
        // Map backend UserResponseDTO to list structure
        setUsersList(paginatedResponse.content.map(u => ({
          id: u.userId,
          employeeId: u.userId || 'N/A',
          name: u.name,
          email: u.email,
          role: u.role || 'CONTRACTOR',
          department: u.department || '',
          organization: u.orgUnitId || 'N/A',
          status: u.status || 'ACTIVE',
        })));

        // Update pagination metadata from Spring Boot Page object
        setTotalPages(paginatedResponse.totalPages || 0);
        setTotalElements(paginatedResponse.totalElements || 0);
      } else {
        setUsersList([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page when page size changes
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setError('');
      setSuccess('');

      if (currentStatus === 'ACTIVE') {
        await suspendUser(id);
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'SUSPENDED' } : u));
        setSuccess(`User account suspended successfully.`);
      } else {
        await activateUser(id);
        setUsersList(prev => prev.map(u => u.id === id ? { ...u, status: 'ACTIVE' } : u));
        setSuccess(`User account reactivated successfully.`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'approved';
      case 'SUSPENDED': return 'rejected';
      case 'INACTIVE': return 'rejected';
      default: return 'pending';
    }
  };

  // Local Search & Column filtering
  const filteredUsers = usersList.filter(u => {
    // 1. Global text search
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchEmp = u.employeeId?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchEmp) return false;
    }

    // 2. Column filters
    if (filterOrg && u.organization !== filterOrg) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (filterRole && u.role !== filterRole) return false;

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

      {/* Advanced Column Filters */}
      <Card className="gf-card p-3 mb-4 border-0 bg-white shadow-sm">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <Form.Group>
              <Form.Label className="small text-muted fw-bold">Organization</Form.Label>
              <Form.Select size="sm" value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)}>
                <option value="">All Organizations</option>
                {uniqueOrgs.map(org => <option key={org} value={org}>{org}</option>)}
              </Form.Select>
            </Form.Group>
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label className="small text-muted fw-bold">Role</Form.Label>
              <Form.Select size="sm" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                {uniqueRoles.map(role => <option key={role} value={role}>{role}</option>)}
              </Form.Select>
            </Form.Group>
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label className="small text-muted fw-bold">Status</Form.Label>
              <Form.Select size="sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </Form.Select>
            </Form.Group>
          </div>
        </div>
      </Card>

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
                      <span className="badge bg-white text-dark border small">
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

          {/* Pagination Controls */}
          <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 text-muted small">
              <span>Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} entries</span>
              <Form.Select
                size="sm"
                style={{ width: '80px' }}
                value={pageSize}
                onChange={handlePageSizeChange}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Form.Select>
              <span>per page</span>
            </div>

            <Pagination size="sm" className="mb-0">
              <Pagination.First onClick={() => handlePageChange(0)} disabled={currentPage === 0} />
              <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0} />

              {[...Array(totalPages)].map((_, idx) => {
                // Show current page, and up to 2 pages before and after
                if (idx === currentPage || idx === currentPage - 1 || idx === currentPage + 1 || idx === 0 || idx === totalPages - 1) {
                  return (
                    <Pagination.Item
                      key={idx}
                      active={idx === currentPage}
                      onClick={() => handlePageChange(idx)}
                    >
                      {idx + 1}
                    </Pagination.Item>
                  );
                } else if (idx === currentPage - 2 || idx === currentPage + 2) {
                  return <Pagination.Ellipsis key={idx} disabled />;
                }
                return null;
              })}

              <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages - 1 || totalPages === 0} />
              <Pagination.Last onClick={() => handlePageChange(totalPages - 1)} disabled={currentPage === totalPages - 1 || totalPages === 0} />
            </Pagination>
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <div className="mb-3 text-muted">
            <i className="bi bi-people" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <p className="text-muted small mb-0">No matching system users found.</p>
        </div>
      )}
    </div>
  );
}

export default Users;
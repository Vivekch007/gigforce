import React, { useEffect, useState } from 'react';
import { Card, Table, Alert, Form, Pagination } from 'react-bootstrap';
import { getOrganizations } from '../../services/organizationService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Organizations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Orgs list
  const [orgsList, setOrgsList] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed for Spring Boot API
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const loadOrgs = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError('');

      const response = await getOrganizations({ page, size });

      // Check if API returns Spring Boot Page object or a plain array
      if (response && response.content) {
        setOrgsList(response.content || []);
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
      } else if (Array.isArray(response)) {
        // Fallback for unpaginated client-side slicing
        setOrgsList(response);
        setTotalPages(Math.ceil(response.length / size));
        setTotalElements(response.length);
      } else {
        setOrgsList([]);
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
    loadOrgs(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page when changing page size
  };

  const getStatusBadge = (status) => {
    return status?.toUpperCase() === 'ACTIVE' ? 'approved' : 'rejected';
  };

  // Slice list locally if API returns raw unpaginated array
  const displayedOrgs = Array.isArray(orgsList) && totalPages > 0 && !orgsList.content
    ? orgsList.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : orgsList;

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Organizations</h2>
          <p className="text-muted small mt-1 mb-0">Registered partner clients, staffing vendors, and organization units derived from user records.</p>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Querying corporate registries..." />
      ) : displayedOrgs.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Org Unit ID</th>
                  <th>User Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrgs.map((o) => (
                  <tr key={o.id || o.code}>
                    <td className="fw-bold">{o.code}</td>
                    <td>
                      <span className="badge bg-secondary rounded-pill">
                        <i className="bi bi-people me-1"></i>{o.userCount}
                      </span>
                    </td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(o.status)}`}>
                        {o.status}
                      </span>
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
                // Show current page, first, last, and immediate neighbor pages
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
          <i className="bi bi-building" style={{ fontSize: '2.5rem', color: 'var(--gf-muted)' }}></i>
          <p className="text-muted small mt-2 mb-0">No tenant organizations found. Register users with org unit IDs to see them listed here.</p>
        </div>
      )}
    </div>
  );
}

export default Organizations;
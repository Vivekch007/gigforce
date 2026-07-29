import React, { useEffect, useState } from 'react';
import { Card, Table, Alert } from 'react-bootstrap';
import { getOrganizations } from '../../services/organizationService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Organizations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Orgs list
  const [orgsList, setOrgsList] = useState([]);

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

  const getStatusBadge = (status) => {
    return status?.toUpperCase() === 'ACTIVE' ? 'approved' : 'rejected';
  };

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
      ) : orgsList.length > 0 ? (
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
                {orgsList.map((o) => (
                  <tr key={o.id}>
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

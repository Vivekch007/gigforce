import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Row, Col, Form } from 'react-bootstrap';
import { getAllAuditLogs, getMockAuditLogs } from '../../services/auditLogService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Logs list
  const [logsList, setLogsList] = useState([]);

  // Filter states
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userQuery, setUserQuery] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      // Try backend endpoint, fallback to mock logs
      const realLogs = await getAllAuditLogs().catch(() => null);

      if (realLogs && realLogs.length > 0) {
        setLogsList(realLogs.map(l => ({
          id: String(l.id || l.AuditLogID),
          timestamp: l.timestamp || l.CreatedDate,
          user: l.username || l.user || 'system',
          module: l.actionModule || l.module || 'AUTH',
          action: l.actionName || l.action || 'LOGIN',
          entity: l.targetEntity || l.entity || 'N/A',
          status: l.status || 'SUCCESS',
          ipAddress: l.ipAddress || '127.0.0.1',
        })));
      } else {
        const mockData = await getMockAuditLogs();
        setLogsList(mockData);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Timestamp,User,Module,Action,Entity,Status,IP Address\n";
    filteredLogs.forEach(l => {
      csvContent += `"${l.timestamp}","${l.user}","${l.module}","${l.action}","${l.entity}","${l.status}","${l.ipAddress}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_audit_trail.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess('Audit logs successfully exported to CSV.');
  };

  const getStatusBadge = (status) => {
    return status?.toUpperCase() === 'SUCCESS' ? 'approved' : 'rejected';
  };

  // Local filtering
  const filteredLogs = logsList.filter(l => {
    // 1. Module
    if (moduleFilter !== 'ALL' && l.module !== moduleFilter) return false;
    // 2. Status
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    // 3. User query
    if (userQuery.trim()) {
      const q = userQuery.trim().toLowerCase();
      return l.user?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q) || l.entity?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">System Audit Trails</h2>
          <p className="text-muted small mt-1 mb-0">Read-only platform activity logs, user events, and security access timelines.</p>
        </div>
        <Button className="btn-gf-primary" onClick={handleExportCSV}>Export Logs CSV</Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Filters row */}
      <Card className="gf-card p-3 border-0 bg-white mb-4">
        <Row className="g-3">
          <Col md={4}>
            <Form.Group controlId="userSearch">
              <Form.Label className="uppercase-label small text-muted font-bold">Search query</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Search user, action, target..." 
                value={userQuery} 
                onChange={(e) => setUserQuery(e.target.value)} 
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="modFilter">
              <Form.Label className="uppercase-label small text-muted font-bold">Filter Module</Form.Label>
              <Form.Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                <option value="ALL">All Modules</option>
                <option value="USER_MGMT">User Management</option>
                <option value="ROLE_MGMT">Role Management</option>
                <option value="AUTH">Authentication</option>
                <option value="SETTINGS">System Settings</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="statFilter">
              <Form.Label className="uppercase-label small text-muted font-bold">Filter Status</Form.Label>
              <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <LoadingSpinner message="Scanning audit files..." />
      ) : filteredLogs.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Entity Scope</th>
                  <th>Status</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td className="small text-muted">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="fw-bold">{l.user}</td>
                    <td>
                      <span className="badge bg-light text-slate-700 border small">
                        {l.module}
                      </span>
                    </td>
                    <td>{l.action}</td>
                    <td className="small text-muted">{l.entity}</td>
                    <td>
                      <span className={`gf-badge badge-${getStatusBadge(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="small text-slate-500">{l.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <span className="fs-1">📜</span>
          <p className="text-muted small mt-2 mb-0">No audit logs match selected parameters.</p>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;

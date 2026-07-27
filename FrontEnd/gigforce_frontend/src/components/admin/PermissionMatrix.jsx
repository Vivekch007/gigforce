import React from 'react';
import { Form, Table } from 'react-bootstrap';

function PermissionMatrix({ rolePermissions, onTogglePermission, disabled = false }) {
  if (!rolePermissions) return null;

  const permissionsList = [
    { key: 'read', label: 'Read' },
    { key: 'create', label: 'Create' },
    { key: 'update', label: 'Update' },
    { key: 'delete', label: 'Delete' },
    { key: 'approve', label: 'Approve' },
    { key: 'export', label: 'Export' },
  ];

  return (
    <div className="table-responsive">
      <Table bordered hover size="sm" className="align-middle text-center small">
        <thead className="table-light">
          <tr>
            <th>Permission Action</th>
            <th>State Status</th>
          </tr>
        </thead>
        <tbody>
          {permissionsList.map((p) => (
            <tr key={p.key}>
              <td className="text-start fw-bold text-slate-700 ps-3">{p.label} Permission</td>
              <td>
                <Form.Check 
                  type="switch"
                  id={`perm-${p.key}`}
                  disabled={disabled}
                  checked={!!rolePermissions[p.key]}
                  onChange={(e) => onTogglePermission(p.key, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default PermissionMatrix;

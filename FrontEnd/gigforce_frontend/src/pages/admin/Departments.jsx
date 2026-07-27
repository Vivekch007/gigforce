import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/departmentService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function Departments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Depts list
  const [deptsList, setDeptsList] = useState([]);

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // Form states
  const [departmentName, setDepartmentName] = useState('');
  const [manager, setManager] = useState('');
  const [organization, setOrganization] = useState('GigForce HQ');
  const [submitting, setSubmitting] = useState(false);

  const loadDepts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDepartments();
      setDeptsList(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepts();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setDepartmentName('');
    setManager('');
    setOrganization('GigForce HQ');
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setDepartmentName(dept.department);
    setManager(dept.manager);
    setOrganization(dept.organization);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!departmentName) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (editingDept) {
        await updateDepartment(editingDept.id, { department: departmentName, manager, organization });
        setSuccess(`Department ${departmentName} updated successfully!`);
      } else {
        await createDepartment({ department: departmentName, manager, organization });
        setSuccess(`Department ${departmentName} added successfully!`);
      }

      setShowModal(false);
      loadDepts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, nameVal) => {
    if (!window.confirm(`Are you sure you want to delete ${nameVal}?`)) return;
    try {
      setError('');
      setSuccess('');
      await deleteDepartment(id);
      setSuccess(`Department ${nameVal} deleted successfully.`);
      loadDepts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Department catalog</h2>
          <p className="text-muted small mt-1 mb-0">Maintain standardized corporate departments and assign executive managers.</p>
        </div>
        <Button className="btn-gf-primary" onClick={openCreateModal}>
          📂 Add Department
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
                  <th>Department Name</th>
                  <th>Executive Manager</th>
                  <th>Parent Organization</th>
                  <th className="text-center">Staff Count</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deptsList.map(d => (
                  <tr key={d.id}>
                    <td className="fw-bold">{d.department}</td>
                    <td>{d.manager}</td>
                    <td>{d.organization}</td>
                    <td className="text-center fw-bold">{d.userCount || 0}</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => openEditModal(d)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(d.id, d.department)}>
                          Delete
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
            {editingDept ? 'Edit Department' : 'Create Department'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="deptName">
              <Form.Label className="uppercase-label">Department Name</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. Talent Acquisition"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="deptManager">
              <Form.Label className="uppercase-label">Executive Manager</Form.Label>
              <Form.Control 
                type="text"
                placeholder="e.g. David Miller"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="deptOrg">
              <Form.Label className="uppercase-label">Corporate Organization</Form.Label>
              <Form.Control 
                type="text"
                placeholder="e.g. GigForce HQ"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
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

export default Departments;

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { getDesignations, createDesignation, updateDesignation, deleteDesignation } from '../../services/designationCatalogService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function DesignationCatalog() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Designations list
  const [designationsList, setDesignationsList] = useState([]);

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);

  // Form states
  const [designationName, setDesignationName] = useState('');
  const [department, setDepartment] = useState('');
  const [grade, setGrade] = useState('L1');
  const [submitting, setSubmitting] = useState(false);

  const loadDesignations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDesignations();
      setDesignationsList(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesignations();
  }, []);

  const openCreateModal = () => {
    setEditingDesig(null);
    setDesignationName('');
    setDepartment('');
    setGrade('L1');
    setShowModal(true);
  };

  const openEditModal = (desig) => {
    setEditingDesig(desig);
    setDesignationName(desig.name);
    setDepartment(desig.department);
    setGrade(desig.grade);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!designationName || !department) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      if (editingDesig) {
        await updateDesignation(editingDesig.id, { name: designationName, department, grade });
        setSuccess(`Designation ${designationName} updated successfully!`);
      } else {
        await createDesignation({ name: designationName, department, grade });
        setSuccess(`Designation ${designationName} added successfully!`);
      }

      setShowModal(false);
      loadDesignations();
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
      await deleteDesignation(id);
      setSuccess(`Designation ${nameVal} deleted successfully.`);
      loadDesignations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Designation catalog</h2>
          <p className="text-muted small mt-1 mb-0">Maintain corporate designation names and standard compensation grades.</p>
        </div>
        <Button className="btn-gf-primary" onClick={openCreateModal}>
          📋 Add Designation
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
                  <th>Designation Name</th>
                  <th>Department Scope</th>
                  <th>Compensation Grade</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {designationsList.map(d => (
                  <tr key={d.id}>
                    <td className="fw-bold">{d.name}</td>
                    <td>{d.department}</td>
                    <td>
                      <span className="badge bg-light text-slate-700 border small">
                        {d.grade}
                      </span>
                    </td>
                    <td>
                      <span className="gf-badge badge-approved">ACTIVE</span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-primary" onClick={() => openEditModal(d)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(d.id, d.name)}>
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

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            {editingDesig ? 'Edit Designation' : 'Add Designation'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="desigName">
              <Form.Label className="uppercase-label">Designation Title</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. Lead Developer"
                value={designationName}
                onChange={(e) => setDesignationName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="desigDept">
              <Form.Label className="uppercase-label">Department</Form.Label>
              <Form.Control 
                type="text"
                required
                placeholder="e.g. Software Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="desigGrade">
              <Form.Label className="uppercase-label">Compensation Grade</Form.Label>
              <Form.Select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="L1">L1 - Entry Associate</option>
                <option value="L2">L2 - Intermediate Professional</option>
                <option value="L3">L3 - Senior Advisor</option>
                <option value="L4">L4 - Executive Director</option>
              </Form.Select>
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

export default DesignationCatalog;

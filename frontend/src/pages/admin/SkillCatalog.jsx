import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getSkills, createSkill, deleteSkill } from '../../services/skillCatalogService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

function SkillCatalog() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Skills list
  const [skillsList, setSkillsList] = useState([]);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Programming Languages');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSkills = async () => {
    try {
      setLoading(true);
      setError('');
      const realSkills = await getSkills();
      setSkillsList(
        realSkills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          description: s.description || '',
        }))
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const openAddModal = () => {
    setEditingSkill(null);
    setName('');
    setCategory('Programming Languages');
    setDescription('')
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await createSkill({ name, category, description });
      setSuccess(`Skill "${name}" successfully added to the catalog!`);

      setShowModal(false);
      loadSkills();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, nameVal) => {
    if (!window.confirm(`Are you sure you want to delete the master skill "${nameVal}"?`)) return;
    try {
      setError('');
      setSuccess('');
      await deleteSkill(id);
      setSuccess(`Master skill "${nameVal}" deleted from catalog.`);
      loadSkills();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Master Skill Catalog</h2>
          <p className="text-muted small mt-1 mb-0">Maintain standardized workforce skill registers used across requisitions, submissions, and profiles.</p>
        </div>
        <Button className="btn-gf-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-2"></i>Add Skill Definition
        </Button>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Reconciling workforce taxonomy..." />
      ) : skillsList.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Skill Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {skillsList.map((s) => (
                  <tr key={s.id}>
                    <td className="fw-semibold">{s.name.toUpperCase()}</td>
                    <td className="text-muted">{s.category}</td>
                    <td className="text-muted">{s.description}</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(s.id, s.name)}>
                          <i className="bi bi-trash me-1"></i>Delete
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
          <i className="bi bi-journal-check" style={{ fontSize: '2.5rem', color: 'var(--gf-muted)' }}></i>
          <p className="text-muted small mt-2 mb-0">No skills defined yet. Add the first skill to get started.</p>
        </div>
      )}

      {/* Add Skill Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">
            Define Master Skill
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>

            <Form.Group className="mb-3" controlId="skillName">
              <Form.Label className="uppercase-label">Skill Name</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g. Java Spring"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="skillCat">
              <Form.Label className="uppercase-label">Category</Form.Label>
              <Form.Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Programming Languages">Programming Languages</option>
                <option value="Frontend">Frontend Development</option>
                <option value="Backend">Backend Development</option>
                <option value="Database">Database Management</option>
                <option value="Cloud">Cloud Infrastructure</option>
                <option value="DevOps">DevOps &amp; CI/CD</option>
                <option value="Soft Skills">Soft Skills</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="skillDescription">
              <Form.Label className="uppercase-label">Skill Description</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g. Java Spring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="btn-gf-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Add to Catalog'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default SkillCatalog;
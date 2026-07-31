import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Alert, Modal, Form, Pagination } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getSkills, createSkill, deleteSkill } from '../../services/skillCatalogService';
import { getErrorMessage } from '../../services/errorUtils';
import { useConfirmation } from '../../context/ConfirmationContext';

// Reusable components
import LoadingSpinner from '../../components/admin/LoadingSpinner';

const CATEGORY_OPTIONS = [
  'Programming Languages',
  'Frontend Development',
  'Backend Development',
  'Database Management',
  'Cloud Infrastructure',
  'DevOps & CI/CD',
  'Soft Skills',
];

function SkillCatalog() {
  const { showConfirmation } = useConfirmation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Skills list
  const [skillsList, setSkillsList] = useState([]);

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed for Spring Boot API
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Programming Languages');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSkills = async (page = currentPage, size = pageSize, catFilter = selectedCategory) => {
    try {
      setLoading(true);
      setError('');

      // Send pagination and category parameters if supported by backend
      const response = await getSkills({ page, size, category: catFilter });

      // Handle Spring Boot Paginated Response structure
      if (response && response.content) {
        setSkillsList(
          response.content.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category || 'General',
            description: s.description || '',
          }))
        );
        setTotalPages(response.totalPages || 0);
        setTotalElements(response.totalElements || 0);
      } else if (Array.isArray(response)) {
        // Fallback for raw unpaginated array
        const mapped = response.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          description: s.description || '',
        }));
        setSkillsList(mapped);
      } else {
        setSkillsList([]);
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
    loadSkills(currentPage, pageSize, selectedCategory);
  }, [currentPage, pageSize, selectedCategory]);

  const handleCategoryFilterChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(0); // Reset to page 0 when filter changes
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < effectiveTotalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(0); // Reset to page 0 on size change
  };

  const openAddModal = () => {
    setEditingSkill(null);
    setName('');
    setCategory('Programming Languages');
    setDescription('');
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
      loadSkills(currentPage, pageSize, selectedCategory);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (skillId, nameVal) => {
    const confirmed = await showConfirmation({
      title: 'Delete Skill',
      message: `Are you sure you want to delete the master skill "${nameVal}"?`,
    });
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      await deleteSkill(skillId);
      setSuccess(`Master skill "${nameVal}" deleted from catalog.`);
      loadSkills(currentPage, pageSize, selectedCategory);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Client-side fallback filtering & slicing if backend returns plain unpaginated array
  const isServerPaginated = totalElements > 0 && totalPages > 0;

  const filteredSkills = isServerPaginated
    ? skillsList
    : skillsList.filter((s) => !selectedCategory || s.category === selectedCategory);

  const effectiveTotalElements = isServerPaginated ? totalElements : filteredSkills.length;
  const effectiveTotalPages = isServerPaginated ? totalPages : Math.ceil(filteredSkills.length / pageSize);

  const displayedSkills = isServerPaginated
    ? skillsList
    : filteredSkills.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  // Extract unique categories available from the data + static preset options
  const availableCategories = Array.from(
    new Set([...CATEGORY_OPTIONS, ...skillsList.map((s) => s.category)])
  ).filter(Boolean);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">Master Skill Catalog</h2>
          <p className="text-muted small mt-1 mb-0">
            Maintain standardized workforce skill registers used across requisitions, submissions, and profiles.
          </p>
        </div>
        <Button className="btn-gf-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-2"></i>Add Skill Definition
        </Button>
      </div>

      {/* Category Filter Bar */}
      <Card className="gf-card p-3 mb-4 border-0 bg-white shadow-sm">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label className="small text-muted fw-bold">Filter by Category</Form.Label>
              <Form.Select size="sm" value={selectedCategory} onChange={handleCategoryFilterChange}>
                <option value="">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        </div>
      </Card>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Reconciling workforce taxonomy..." />
      ) : displayedSkills.length > 0 ? (
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
                {displayedSkills.map((s) => (
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

          {/* Pagination Controls */}
          <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 text-muted small">
              <span>
                Showing {effectiveTotalElements === 0 ? 0 : currentPage * pageSize + 1} to{' '}
                {Math.min((currentPage + 1) * pageSize, effectiveTotalElements)} of {effectiveTotalElements} entries
              </span>
              <Form.Select size="sm" style={{ width: '80px' }} value={pageSize} onChange={handlePageSizeChange}>
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

              {[...Array(effectiveTotalPages)].map((_, idx) => {
                if (
                  idx === currentPage ||
                  idx === currentPage - 1 ||
                  idx === currentPage + 1 ||
                  idx === 0 ||
                  idx === effectiveTotalPages - 1
                ) {
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

              <Pagination.Next
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === effectiveTotalPages - 1 || effectiveTotalPages === 0}
              />
              <Pagination.Last
                onClick={() => handlePageChange(effectiveTotalPages - 1)}
                disabled={currentPage === effectiveTotalPages - 1 || effectiveTotalPages === 0}
              />
            </Pagination>
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <i className="bi bi-journal-check" style={{ fontSize: '2.5rem', color: 'var(--gf-muted)' }}></i>
          <p className="text-muted small mt-2 mb-0">No skills found matching the selected category.</p>
        </div>
      )}

      {/* Add Skill Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-slate-800">Define Master Skill</Modal.Title>
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
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="skillDescription">
              <Form.Label className="uppercase-label">Skill Description</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g. Core framework for Java enterprise web services"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
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
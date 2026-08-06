import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, Button, Table, Offcanvas, Form, Pagination } from 'react-bootstrap';
import { getAssignments } from '../../services/assignmentService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import '../../styles/contractor.css';

function Assignments() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);

  // Selected assignment for the side drawer
  const [selectedAsn, setSelectedAsn] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;
    const loadAssignments = async () => {
      try {
        setLoading(true);
        const data = await getAssignments();
        if (active) {
          setAssignments(data.content || []);
        }
      } catch (err) {
        if (active) {
          showToast(getErrorMessage(err), 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadAssignments();
    return () => { active = false; };
  }, [showToast]);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  const handleOpenDrawer = (asn) => {
    setSelectedAsn(asn);
    setShowDrawer(true);
  };

  const handleCloseDrawer = () => {
    setSelectedAsn(null);
    setShowDrawer(false);
  };

  // 1. Filter assignments based on search query
  const filteredAssignments = assignments.filter((asn) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      (asn.requisitionTitle && asn.requisitionTitle.toLowerCase().includes(query)) ||
      (asn.hiringManagerName && asn.hiringManagerName.toLowerCase().includes(query)) ||
      (asn.status && asn.status.toLowerCase().includes(query))
    );
  });

  // 2. Sort by End Date descending (latest end dates first)
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
    const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
    return dateB - dateA;
  });

  // 3. Paginate the sorted data
  const totalElements = sortedAssignments.length;
  const totalPages = Math.ceil(totalElements / pageSize);

  const displayedAssignments = sortedAssignments.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(0);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-3 text-muted">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div>
          <h2 className="fw-black text-slate-800 mb-0">My Assignments</h2>
          <p className="text-muted small mt-1 mb-0">Track and review SOW placements and rates.</p>
        </div>
      </div>

      {searchQuery && (
        <div className="mb-3 text-muted small">
          Showing search results for: &ldquo;<strong>{searchQuery}</strong>&rdquo;
        </div>
      )}

      {/* Placements Grid */}
      <div className="gf-card p-0 overflow-hidden">
        {displayedAssignments.length > 0 ? (
          <>
            <Table responsive hover className="align-middle text-sm mb-0">
              <thead className="bg-light">
                <tr className="text-uppercase text-muted border-bottom" style={{ fontSize: '0.75rem' }}>
                  <th className="p-3">Role / Requisition</th>
                  <th className="p-3">Hiring Manager</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Daily Rate</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedAssignments.map((asn) => (
                  <tr key={asn.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDrawer(asn)}>
                    <td className="p-3 fw-bold text-slate-800">{asn.requisitionTitle || 'Contractor Placement'}</td>
                    <td className="p-3">{asn.hiringManagerName}</td>
                    <td className="p-3">{asn.startDate}</td>
                    <td className="p-3 fw-medium">{asn.endDate}</td>
                    <td className="p-3 text-green-600 fw-semibold">${asn.agreedRatePerDay}/day</td>
                    <td className="p-3">
                      <span className={`gf-badge badge-${asn.status?.toLowerCase()}`}>
                        {asn.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="px-2 py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(asn);
                        }}
                      >
                        👁 View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination Controls Footer */}
            <div className="d-flex justify-content-between align-items-center p-3 border-top flex-wrap gap-2 bg-white">
              <div className="d-flex align-items-center gap-2 text-muted small">
                <span>
                  Showing {totalElements === 0 ? 0 : currentPage * pageSize + 1} to{' '}
                  {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} entries
                </span>
                <Form.Select size="sm" style={{ width: '80px' }} value={pageSize} onChange={handlePageSizeChange}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </Form.Select>
                <span>per page</span>
              </div>

              {totalPages > 1 && (
                <Pagination size="sm" className="mb-0">
                  <Pagination.First onClick={() => handlePageChange(0)} disabled={currentPage === 0} />
                  <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0} />

                  {[...Array(totalPages)].map((_, idx) => {
                    if (
                      idx === currentPage ||
                      idx === currentPage - 1 ||
                      idx === currentPage + 1 ||
                      idx === 0 ||
                      idx === totalPages - 1
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
                    disabled={currentPage === totalPages - 1 || totalPages === 0}
                  />
                  <Pagination.Last
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={currentPage === totalPages - 1 || totalPages === 0}
                  />
                </Pagination>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-5">
            <span className="fs-1">📂</span>
            <p className="text-muted small mt-2 mb-0">
              {searchQuery ? 'No matching assignments found.' : 'No assignments mapped to your account.'}
            </p>
          </div>
        )}
      </div>

      {/* SOW Details Drawer */}
      <Offcanvas show={showDrawer} onHide={handleCloseDrawer} placement="end" style={{ width: '400px' }}>
        <Offcanvas.Header closeButton className="border-bottom bg-slate-900 text-light">
          <Offcanvas.Title className="fw-bold">Assignment SOW Details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="bg-light">
          {selectedAsn && (
            <div className="d-flex flex-column gap-3">
              {/* Placement Title Card */}
              <div className="gf-card bg-white p-3 mb-0">
                <h5 className="fw-black text-slate-800 mb-1">{selectedAsn.requisitionTitle || 'Contractor'}</h5>
                <span className="text-muted small">Assignment ID: {selectedAsn.id}</span>
                <div className="mt-3">
                  <span className={`gf-badge badge-${selectedAsn.status?.toLowerCase()}`}>
                    {selectedAsn.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* SOW Metrics Details */}
              <div className="gf-card bg-white p-3 mb-0 d-flex flex-column gap-2">
                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>
                    Hiring Manager
                  </span>
                  <p className="fw-semibold text-slate-800 mb-0">{selectedAsn.hiringManagerName} ({selectedAsn.hiringManagerEmail})</p>
                </div>

                <hr className="my-2" />

                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>
                    Vendor Details
                  </span>
                  <p className="fw-semibold text-slate-800 mb-0">Sourced via Platform</p>
                </div>

                <hr className="my-2" />

                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>
                    Engagement Type
                  </span>
                  <p className="fw-semibold text-slate-800 mb-0">{selectedAsn.engagementType || 'HYBRID'}</p>
                </div>

                <hr className="my-2" />

                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>
                    Duration Range
                  </span>
                  <p className="fw-semibold text-slate-800 mb-0">
                    {selectedAsn.startDate} to {selectedAsn.endDate}
                  </p>
                </div>

                <hr className="my-2" />

                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>
                    Agreed Billable Rate
                  </span>
                  <p className="fw-bold text-green-600 mb-0">${selectedAsn.agreedRatePerDay} USD / Day</p>
                </div>

                <hr className="my-2" />

                <div>
                  <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>
                    SOW Reference ID
                  </span>
                  <p className="fw-mono text-slate-800 mb-0 small">
                    {selectedAsn.sowReference || 'Not Specified'}
                  </p>
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={handleCloseDrawer} className="w-100 py-2">
                  Close Panel
                </Button>
              </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}

export default Assignments;
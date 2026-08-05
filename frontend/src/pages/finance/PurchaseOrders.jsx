import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Alert, Offcanvas } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { getPurchaseOrders, getPurchaseOrderDetails } from '../../services/financePurchaseOrderService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable components
import LoadingSpinner from '../../components/finance/LoadingSpinner';

function PurchaseOrders() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchVal = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // POs list
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // Details drawer
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Role check
  const isFinanceManager = user?.role === 'FINANCE';

  const loadPOs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPurchaseOrders();
      setPurchaseOrders(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOs();
  }, []);

  const handleReviewPO = async (po) => {
    try {
      setDetailsLoading(true);
      const details = await getPurchaseOrderDetails(po.id || po.POID);
      setSelectedPo(details);
      setShowDetailsDrawer(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'ACTIVE':
        return '#28a745'; // Green
      case 'SUBMITTED':
        return '#007bff'; // Blue
      case 'APPROVED':
        return '#17a2b8'; // Cyan
      case 'CANCELLED':
        return '#dc3545'; // Red
      case 'EXPIRED':
        return '#6c757d'; // Gray
      default:
        return '#ffc107'; // Yellow
    }
  };

  const getStatusBgColor = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case 'ACTIVE':
        return '#d4edda'; // Light green
      case 'SUBMITTED':
        return '#d1ecf1'; // Light blue
      case 'APPROVED':
        return '#d1ecf1'; // Light cyan
      case 'CANCELLED':
        return '#f8d7da'; // Light red
      case 'EXPIRED':
        return '#e2e3e5'; // Light gray
      default:
        return '#fff3cd'; // Light yellow
    }
  };

  // Local Search & Role Filtering
  const filteredPOs = purchaseOrders.filter(po => {
    // 1. Search Query filter
    if (searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      if (!po.id?.toLowerCase().includes(q) && !po.contractorName?.toLowerCase().includes(q)) {
        return false;
      }
    }
    // 2. Role-based queue limits (for FINANCE role, simulate showing only assigned POs)
    if (!isFinanceManager) {
      // Simulate assignment: standard FINANCE user sees only items assigned to their email
      const assignedEmail = (po.id && po.id.charCodeAt(po.id.length - 1) % 2 === 0) 
        ? 'finance@gigforce.com' 
        : 'other_finance@gigforce.com';
      return assignedEmail === (user?.email || 'finance@gigforce.com');
    }
    return true;
  });

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Purchase Orders</h2>
        <p className="text-muted small mt-1 mb-0">Review staffing purchase orders submitted by vendors for billing.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {loading ? (
        <LoadingSpinner message="Searching purchase records..." />
      ) : filteredPOs.length > 0 ? (
        <Card className="gf-card p-4 border-0 bg-white">
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>PO Number</th>
                  <th>Contractor</th>
                  <th>Amount</th>
                  <th>Approved By</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map(po => (

                  <tr key={po.POID || po.id}>
                    <td className="fw-bold">{po.POID || po.id}</td>
                    <td>{po.contractorName || 'Contractor'}</td>
                    <td className="text-green-600 fw-bold">₹{parseFloat(po.POAmount || po.poAmount || 0).toLocaleString()}</td>
                    <td>{po.ApprovedByHRUserID || po.hiringManagerId || 'Pending'}</td>
                    <td>
                      <span 
                        className="badge"
                        style={{
                          backgroundColor: getStatusBgColor(po.Status),
                          color: getStatusColor(po.Status),
                          fontWeight: 'bold'
                        }}
                      >
                        {po.Status}
                      </span>
                    </td>
                    <td className="text-end">
                      <Button 
                        size="sm" 
                        variant="outline-primary" 
                        onClick={() => handleReviewPO(po)}
                        disabled={detailsLoading}
                      >
                        Review PO
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0">
          <div className="mb-3 text-muted">
            <i className="bi bi-file-earmark-text" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <p className="text-muted small mb-0">No purchase orders available for review.</p>
        </div>
      )}

      {/* PO Details Drawer */}
      <Offcanvas 
        show={showDetailsDrawer} 
        onHide={() => setShowDetailsDrawer(false)}
        placement="end"
        style={{ width: '500px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold">Purchase Order Details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {detailsLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
           ) : selectedPo ? (
             <div>
               <div className="bg-light p-3 rounded mb-3">
                 <div className="small text-muted font-bold text-uppercase mb-2" style={{ fontSize: '10px' }}>PO Reference</div>
                 <h5 className="fw-bold text-dark mb-2">{selectedPo.id || selectedPo.POID}</h5>
                 <div className="small text-muted mb-3">Assignment: {selectedPo.AssignmentID || selectedPo.assignmentId}</div>
                 <span
                   className="badge"
                   style={{
                     backgroundColor: getStatusBgColor(selectedPo.status || selectedPo.Status),
                     color: getStatusColor(selectedPo.status || selectedPo.Status),
                     fontWeight: 'bold'
                   }}
                 >
                   {selectedPo.status || selectedPo.Status}
                 </span>
               </div>

               {/* Assignment Details */}
               <div className="mb-4">
                 <h6 className="fw-bold text-slate-800 mb-3">Assignment Details</h6>
                 <div className="row g-2 small">
                   <div className="col-6">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Contractor</span>
                     <span className="fw-semibold text-dark">{selectedPo.contractorName || 'N/A'}</span>
                   </div>
                   <div className="col-6">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Organization</span>
                     <span className="fw-semibold text-dark">{selectedPo.OrganizationID || selectedPo.orgUnitId || 'N/A'}</span>
                   </div>
                   <div className="col-6 mt-3">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Start Date</span>
                     <span className="fw-semibold text-dark">{selectedPo.startDate || 'N/A'}</span>
                   </div>
                   <div className="col-6 mt-3">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>End Date</span>
                     <span className="fw-semibold text-dark">{selectedPo.endDate || 'N/A'}</span>
                   </div>
                 </div>
               </div>

               {/* Financial Details */}
               <div className="mb-4">
                 <h6 className="fw-bold text-slate-800 mb-3">Financial Details</h6>
                 <div className="row g-2 small">
                   <div className="col-6">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>PO Amount</span>
                     <span className="fw-bold text-success">₹{parseFloat(selectedPo.POAmount || selectedPo.poAmount || 0).toLocaleString()}</span>
                   </div>
                   <div className="col-6">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Balance Amount</span>
                     <span className="fw-bold text-success">₹{parseFloat(selectedPo.balanceAmount || 0).toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               {/* Dates */}
               <div className="mb-4">
                 <h6 className="fw-bold text-slate-800 mb-3">PO Dates</h6>
                 <div className="row g-2 small">
                   <div className="col-6">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Issued Date</span>
                     <span className="fw-semibold text-dark">{selectedPo.IssuedDate || selectedPo.issuedDate || 'N/A'}</span>
                   </div>
                   <div className="col-6">
                     <span className="text-muted d-block text-uppercase" style={{ fontSize: '10px', fontWeight: 'bold' }}>Expiry Date</span>
                     <span className="fw-semibold text-dark">{selectedPo.ExpiryDate || selectedPo.expiryDate || 'N/A'}</span>
                   </div>
                 </div>
               </div>
            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}

export default PurchaseOrders;

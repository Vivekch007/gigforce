import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { getPurchaseOrders, approvePurchaseOrder, cancelPurchaseOrder } from '../../services/purchaseOrderService';
import { getErrorMessage } from '../../services/errorUtils';
import { useConfirmation } from '../../context/ConfirmationContext';
import Loader from '../../components/Loader';

function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { showConfirmation } = useConfirmation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actioningId, setActioningId] = useState(null);

  const loadPurchaseOrders = async () => {
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
    loadPurchaseOrders();
  }, []);

  const handleApprove = async (po) => {
    const poId = po.POID || po.id;
    const confirmed = await showConfirmation({
      title: 'Approve Purchase Order',
      message: `Approve PO ${poId}? Once approved, the vendor can generate invoices against it.`,
      confirmLabel: 'Approve',
      variant: 'success',
    });
    if (!confirmed) return;

    try {
      setActioningId(poId);
      setError('');
      setSuccess('');
      await approvePurchaseOrder(poId);
      setSuccess(`PO ${poId} approved. Invoices can now be raised against it.`);
      loadPurchaseOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (po) => {
    const poId = po.POID || po.id;
    const confirmed = await showConfirmation({
      title: 'Cancel Purchase Order',
      message: `Cancel PO ${poId}? This cannot be undone.`,
      confirmLabel: 'Cancel PO',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      setActioningId(poId);
      setError('');
      setSuccess('');
      await cancelPurchaseOrder(poId);
      setSuccess(`PO ${poId} cancelled.`);
      loadPurchaseOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'secondary';
      case 'EXHAUSTED': return 'secondary';
      default: return 'danger';
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const poStatus = po.Status || po.status || '';
    const poId = po.POID || po.id || '';
    const assignmentId = po.AssignmentID || po.assignmentId || '';
    const contractor = po.contractorName || '';
    const vendor = po.vendorName || '';

    if (statusFilter !== 'ALL' && poStatus.toUpperCase() !== statusFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.trim().toLowerCase();
    return (
      poId.toLowerCase().includes(q) ||
      assignmentId.toLowerCase().includes(q) ||
      contractor.toLowerCase().includes(q) ||
      vendor.toLowerCase().includes(q)
    );
  });

  const pendingCount = purchaseOrders.filter(po => (po.Status || po.status) === 'PENDING').length;

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 className="page-title mb-1">Purchase Orders</h1>
          <p className="muted-text">Review and approve vendor-raised purchase orders. Only approved POs can be invoiced.</p>
        </div>
        <Form.Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="enterprise-form-select"
          style={{ width: '200px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="EXHAUSTED">Exhausted</option>
          <option value="CANCELLED">Cancelled</option>
        </Form.Select>
      </div>

      {error && <Alert variant="danger" className="enterprise-alert enterprise-alert-danger mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="enterprise-alert enterprise-alert-success mb-4" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {pendingCount > 0 && (
        <Alert variant="warning" className="mb-4">
          <i className="bi bi-hourglass-split me-2"></i>
          {pendingCount} purchase order{pendingCount > 1 ? 's' : ''} awaiting your approval.
        </Alert>
      )}

      {loading ? (
        <Loader message="Loading purchase orders..." />
      ) : filteredPOs.length > 0 ? (
        <div className="enterprise-table-container p-3 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <div className="table-responsive">
            <Table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>PO Ref</th>
                  <th>Assignment ID</th>
                  <th>Contractor</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Issued</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map(po => {
                  const poId = po.POID || po.id;
                  const assignmentId = po.AssignmentID || po.assignmentId || 'N/A';
                  const contractor = po.contractorName || 'N/A';
                  const vendor = po.vendorName || 'N/A';
                  const amount = po.POAmount ?? po.poAmount ?? 0;
                  const currency = po.Currency || po.currency || 'INR';
                  const issued = po.IssuedDate || po.issuedDate || 'N/A';
                  const expiry = po.ExpiryDate || po.expiryDate || 'N/A';
                  const status = po.Status || po.status || 'N/A';

                  return (
                    <tr key={poId}>
                      <td className="fw-bold">{poId}</td>
                      <td className="fw-semibold text-dark">{assignmentId}</td>
                      <td>{contractor}</td>
                      <td>{vendor}</td>
                      <td className="text-success fw-bold">
                        {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€'}{parseFloat(amount).toLocaleString()}
                      </td>
                      <td className="small">{issued}</td>
                      <td className="small">{expiry}</td>
                      <td>
                        <span className={`status-pill ${getStatusBadge(status)}`}>{status}</span>
                      </td>
                      <td className="text-end">
                        {status.toUpperCase() === 'PENDING' ? (
                          <div className="d-flex gap-2 justify-content-end">
                            <button
                              className="btn-enterprise-primary py-1 px-3"
                              onClick={() => handleApprove(po)}
                              disabled={actioningId === poId}
                            >
                              {actioningId === poId ? <Spinner animation="border" size="sm" /> : 'Approve'}
                            </button>
                            <button
                              className="btn-enterprise-ghost text-danger py-1 px-3 border-0"
                              onClick={() => handleCancel(po)}
                              disabled={actioningId === poId}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted small">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-center py-5 gf-card bg-white border-0" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
          <i className="bi bi-receipt fs-1 text-muted"></i>
          <p className="text-muted small mt-2 mb-0">No purchase orders found.</p>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;

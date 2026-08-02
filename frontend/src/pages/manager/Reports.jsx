import React, { useEffect, useState } from 'react';
import { Spinner, Alert, Table } from 'react-bootstrap';
import { getAssignments } from '../../services/managerAssignmentService';
import { getTimesheetsToApprove, getLeavesToApprove } from '../../services/approvalService';
import { getInterviews } from '../../services/interviewService';
import { getBusinessUnitDashboard } from '../../services/managerAnalyticsService';
import { getRequisitions } from '../../services/requisitionService';
import { getErrorMessage } from '../../services/errorUtils';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';

function Reports() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report state data
  const [summary, setSummary] = useState({
    openJobs: 0,
    filledJobs: 0,
    pendingInterviews: 0,
    pendingApprovals: 0,
    activeContractors: 0,
    totalSpend: 0,
  });

  const [activePlacements, setActivePlacements] = useState([]);
  const [openJobsList, setOpenJobsList] = useState([]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        buDashboard,
        asnData,
        tsData,
        leavesData,
        interviewsData,
        reqsData,
      ] = await Promise.all([
        getBusinessUnitDashboard(user?.orgUnitId || 'all').catch(() => null),
        getAssignments({ size: 100 }).catch(() => ({ content: [] })),
        getTimesheetsToApprove().catch(() => []),
        getLeavesToApprove().catch(() => []),
        getInterviews().catch(() => []),
        getRequisitions({ size: 100 }).catch(() => ({ content: [] })),
      ]);

      const asns = asnData?.content || [];
      const reqs = reqsData?.content || [];

      const pendingIntsCount = interviewsData.filter(i => i.status === 'SCHEDULED').length;
      const pendingApprovalsCount = tsData.filter(t => t.status === 'SUBMITTED').length + leavesData.filter(l => l.status === 'PENDING').length;
      const activeContractorsCount = asns.filter(a => a.status === 'ACTIVE').length;
      const filledAssignmentsCount = asns.filter(a => a.status === 'COMPLETED').length;

      const openRequisitionsCount = reqs.filter(r => r.status === 'OPEN').length;

      setSummary({
        openJobs: openRequisitionsCount,
        filledJobs: filledAssignmentsCount,
        pendingInterviews: pendingIntsCount,
        pendingApprovals: pendingApprovalsCount,
        activeContractors: activeContractorsCount,
        totalSpend: buDashboard ? Number(buDashboard.totalSpend ?? 0) : 0,
      });

      setOpenJobsList(reqs.filter(r => r.status === 'OPEN'));
      setActivePlacements(asns.filter(a => a.status === 'ACTIVE'));

    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-black text-slate-800 mb-0">Manager Reporting</h2>
        <p className="text-muted small mt-1 mb-0">Real-time workforce planning metrics and active engagement dashboard.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted small mt-2">Compiling workforce report...</p>
        </div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Open Requisitions</span>
                <h3 className="fw-black text-slate-800 mt-1 mb-0">{summary.openJobs}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Filled Positions</span>
                <h3 className="fw-black text-green-600 mt-1 mb-0">{summary.filledJobs}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Scheduled Interviews</span>
                <h3 className="fw-black text-blue-600 mt-1 mb-0">{summary.pendingInterviews}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Pending Approvals</span>
                <h3 className="fw-black text-amber-600 mt-1 mb-0">{summary.pendingApprovals}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Active Hires</span>
                <h3 className="fw-black text-slate-800 mt-1 mb-0">{summary.activeContractors}</h3>
              </div>
            </div>
            <div className="col">
              <div className="gf-card mb-0 p-3 h-100 text-center">
                <span className="text-uppercase text-muted font-bold small" style={{ fontSize: '0.65rem' }}>Total Contractor Spend (₹)</span>
                <h3 className="fw-black text-success mt-1 mb-0">
                  {summary.totalSpend > 0
                    ? `₹${Number(summary.totalSpend).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : '₹0'}
                </h3>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          {/* Active Placements Table */}
          <div className="mb-4">
            <h4 className="fw-bold mb-3 text-slate-800">Active Hires</h4>
            <div className="enterprise-table-container p-3 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Contractor</th>
                      <th>Job Title</th>
                      <th>Agreed Rate (₹/day)</th>
                      <th>Assignment Start Date</th>
                      <th>Assignment End Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlacements.length > 0 ? (
                      activePlacements.map(p => (
                        <tr key={p.id}>
                          <td className="fw-semibold text-slate-800">{p.contractorName}</td>
                          <td>{p.requisitionTitle}</td>
                          <td className="text-success fw-bold">₹{Number(p.agreedRatePerDay || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                          <td>{p.startDate}</td>
                          <td>{p.endDate}</td>
                          <td>
                            <span className="status-pill success">{p.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">No active hires found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          {/* Open Job Postings Table */}
          <div className="mb-4">
            <h4 className="fw-bold mb-3 text-slate-800">Open Job Postings</h4>
            <div className="enterprise-table-container p-3 bg-white" style={{ borderRadius: 'var(--gf-radius)', boxShadow: 'var(--gf-shadow)' }}>
              <div className="table-responsive">
                <Table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Requisition ID</th>
                      <th>Job Title</th>
                      <th>Employment Type</th>
                      <th>Quantity</th>
                      <th>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openJobsList.length > 0 ? (
                      openJobsList.map(j => (
                        <tr key={j.id}>
                          <td className="fw-bold">{j.id}</td>
                          <td className="fw-semibold text-slate-800">{j.title}</td>
                          <td>{j.engagementType}</td>
                          <td>{j.quantity}</td>
                          <td>{j.createdAt ? j.createdAt.substring(0, 10) : ''}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-4">No open job requisitions found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;

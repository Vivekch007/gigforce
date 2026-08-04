import React, { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { getVendorDashboardMetrics } from '../../services/vendorDashboardService';
import { getErrorMessage } from '../../services/errorUtils';

// Reusable custom components
import VendorMetricCard from '../../components/vendor/VendorMetricCard';
import LoadingSpinner from '../../components/vendor/LoadingSpinner';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report state data
  const [summary, setSummary] = useState(null);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getVendorDashboardMetrics();
      setSummary(data);
    } catch (err) {
      setError(getErrorMessage(err));
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
        <h2 className="fw-black text-slate-800 mb-0">Vendor Analytics</h2>
        <p className="text-muted small mt-1 mb-0">Real-time submission and placement metrics.</p>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {loading ? (
        <LoadingSpinner message="Generating scorecard..." />
      ) : (
        <div>
          {/* KPI Metrics */}
          <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
            <div className="col">
              <VendorMetricCard title="Open Requisitions" value={summary?.openReqs} desc="Active vacancies posted" />
            </div>
            <div className="col">
              <VendorMetricCard title="Candidates Submitted" value={summary?.submittedCandidates} desc="Awaiting client feedback" />
            </div>
            <div className="col">
              <VendorMetricCard title="Shortlisted Candidates" value={summary?.shortlistedCandidates} desc="Moving to interviews" />
            </div>
            <div className="col">
              <VendorMetricCard title="Selected Candidates" value={summary?.selectedCandidates} desc="Hired candidates" />
            </div>
            <div className="col">
              <VendorMetricCard title="Active Contractors" value={summary?.activeAssignments} desc="Currently on project contract" />
            </div>
            <div className="col">
              <VendorMetricCard title="Purchase Orders Raised" value={summary?.totalPOs} desc="Total POs submitted to date" />
            </div>
            <div className="col">
              <VendorMetricCard title="Pending Purchase Orders" value={summary?.pendingPOs} desc="Awaiting hiring-manager approval" />
            </div>
            <div className="col">
              <VendorMetricCard title="Pending Timesheets" value={summary?.pendingTimesheets} desc="Awaiting contractor submission" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;

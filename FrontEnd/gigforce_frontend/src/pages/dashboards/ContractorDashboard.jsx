import { useEffect, useState } from 'react';
import DashboardPlaceholder from './DashboardPlaceholder';
import { getMyContractorProfile } from '../../services/authService';

// Registering as CONTRACTOR fires an async, after-commit backend event that
// creates the ContractorProfile, so GET /contractors/profiles/me can briefly
// 404 right after registration/first login. We retry once after a short delay
// before showing a "still setting up" message instead of a hard error.
function ContractorDashboard() {
  const [status, setStatus] = useState('loading'); // loading | ready | pending | error
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let hasRetried = false;

    const fetchProfile = async () => {
      try {
        const data = await getMyContractorProfile();
        if (!cancelled) {
          setProfile(data);
          setStatus('ready');
        }
      } catch (err) {
        const statusCode = err?.response?.status;
        if (statusCode === 404 && !hasRetried) {
          hasRetried = true;
          setTimeout(fetchProfile, 1500);
          return;
        }
        if (!cancelled) {
          setStatus(statusCode === 404 ? 'pending' : 'error');
        }
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardPlaceholder title="Contractor Dashboard" badgeVariant="bg-success">
      {status === 'loading' && <p className="text-muted">Loading your profile…</p>}

      {status === 'pending' && (
        <div className="alert alert-info">
          Your contractor profile is still being set up. This usually takes just a few seconds —
          refresh the page shortly.
        </div>
      )}

      {status === 'error' && (
        <div className="alert alert-warning">
          We couldn&apos;t load your profile right now. Please try again later.
        </div>
      )}

      {status === 'ready' && profile && (
        <div className="alert alert-success">
          Profile loaded for <strong>{profile.displayName || profile.userName}</strong>.
        </div>
      )}
    </DashboardPlaceholder>
  );
}

export default ContractorDashboard;

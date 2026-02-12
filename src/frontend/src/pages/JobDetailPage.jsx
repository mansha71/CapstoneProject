import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import JobStatusCard from '../components/sessions/JobStatusCard';
import { cancelJob, getJob } from '../services/jobs';

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    if (!confirm('Cancel this job? It will be removed from the queue.')) return;
    try {
      await cancelJob(jobId);
      navigate('/sessions');
    } catch (err) {
      alert(err.message || 'Failed to cancel job');
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadJob = async () => {
      try {
        setError('');
        const jobData = await getJob(jobId);
        if (mounted) setJob(jobData);
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Unable to load job');
      }
    };

    loadJob();
    const timer = setInterval(loadJob, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [jobId]);

  return (
    <section className="page-shell">
      <div className="page-header-row">
        <div>
          <h1>Processing Job</h1>
          {jobId ? (
            <p className="job-identifier job-identifier-page" title="Use this ID to match with Completed Sessions.">
              Job: <span className="job-id-value">{jobId}</span>
            </p>
          ) : null}
          <p>Deep-link job view for notifications, sharing, and debugging.</p>
        </div>
        <Link to="/sessions" className="secondary-link">
          Back to Sessions
        </Link>
      </div>

      {error ? <p className="job-error">{error}</p> : null}
      {job ? <JobStatusCard job={job} onCancel={handleCancel} showViewJob={false} /> : <p>Loading job status...</p>}
    </section>
  );
};

export default JobDetailPage;

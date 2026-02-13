import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import JobStatusCard from '../components/sessions/JobStatusCard';
import { cancelJob, getJob } from '../services/jobs';

const formatDate = (value) => {
  if (!value) return null;
  return new Date(value).toLocaleString();
};

const normalizeProgress = (rawProgress) => {
  if (typeof rawProgress !== 'number' || Number.isNaN(rawProgress)) return 0;
  if (rawProgress <= 1) return Math.round(rawProgress * 100);
  return Math.round(rawProgress);
};

const statusMessage = (status) => {
  if (status === 'queued') return 'Queued: waiting for an available worker.';
  if (status === 'running') return 'Processing started: decoding and tracking are in progress.';
  if (status === 'completed') return 'Processing completed successfully.';
  if (status === 'failed') return 'Processing failed.';
  return `Status changed to ${status}.`;
};

const buildLogUpdates = (previousJob, nextJob, existingLogs) => {
  const logs = [...existingLogs];
  const pushLog = (level, message, time, details = null) => {
    const signature = `${level}|${message}|${time || ''}|${details || ''}`;
    if (logs.some((entry) => entry.signature === signature)) return;
    logs.push({
      id: `${Date.now()}-${logs.length}`,
      level,
      message,
      time: time || new Date().toISOString(),
      details,
      signature,
    });
  };

  if (!previousJob) {
    pushLog('info', 'Job record created.', nextJob.createdAt);
    pushLog('info', statusMessage(nextJob.status), nextJob.updatedAt);
  }

  if (previousJob && previousJob.status !== nextJob.status) {
    pushLog(nextJob.status === 'failed' ? 'error' : 'info', statusMessage(nextJob.status), nextJob.updatedAt);
  }

  const prevProgress = normalizeProgress(previousJob?.progress);
  const nextProgress = normalizeProgress(nextJob?.progress);
  const crossedMilestone =
    Math.floor(prevProgress / 10) !== Math.floor(nextProgress / 10) && nextJob.status === 'running';
  if (previousJob && crossedMilestone && nextProgress > prevProgress) {
    pushLog('info', `Progress update: ${nextProgress}% complete.`, nextJob.updatedAt);
  }

  if (!previousJob?.startedAt && nextJob.startedAt) {
    pushLog('info', 'Worker started processing this job.', nextJob.startedAt);
  }

  if (!previousJob?.finishedAt && nextJob.finishedAt) {
    pushLog(
      nextJob.status === 'failed' ? 'error' : 'info',
      nextJob.status === 'failed' ? 'Job marked as failed and processing stopped.' : 'Job finished.',
      nextJob.finishedAt
    );
  }

  if (nextJob.error && previousJob?.error !== nextJob.error) {
    pushLog('error', 'Error details received from backend.', nextJob.updatedAt, nextJob.error);
  }

  if (nextJob.status === 'completed' && nextJob.sessionId && previousJob?.sessionId !== nextJob.sessionId) {
    pushLog('info', `Output session is ready: ${nextJob.sessionId}.`, nextJob.updatedAt);
  }

  return logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
};

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [jobLogs, setJobLogs] = useState([]);
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
        if (!mounted || !jobData) return;
        setJob((previousJob) => {
          setJobLogs((existingLogs) => buildLogUpdates(previousJob, jobData, existingLogs));
          return jobData;
        });
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

      {job ? (
        <section className="page-panel job-log-panel">
          <h2>Processing Log</h2>
          <p className="helper-text">
            Live status events and backend-reported details for this job.
          </p>
          <div className="job-log-list">
            {jobLogs.length ? (
              jobLogs.map((entry) => (
                <article key={entry.id} className={`job-log-entry ${entry.level === 'error' ? 'error' : ''}`}>
                  <div className="job-log-entry-header">
                    <strong>{entry.message}</strong>
                    <span>{formatDate(entry.time) || 'Unknown time'}</span>
                  </div>
                  {entry.details ? <p className="job-log-details">{entry.details}</p> : null}
                </article>
              ))
            ) : (
              <p className="helper-text">No events yet. This log updates every few seconds.</p>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default JobDetailPage;

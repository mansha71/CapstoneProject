import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import SessionList from '../components/sessions/SessionList';
import JobList from '../components/sessions/JobList';
import { deleteSession, listSessions } from '../services/sessions';
import { cancelJob, listJobs } from '../services/jobs';
import { getQueueHealth, recoverQueue } from '../services/queue';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

const SessionsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualRefreshOnly, setManualRefreshOnly] = useState(false);
  const [queueHealth, setQueueHealth] = useState(null);

  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === 'queued' || job.status === 'running'),
    [jobs]
  );

  const handleCancelJob = async (jobId) => {
    await cancelJob(jobId);
    await loadData();
  };

  const handleDeleteSession = async (sessionId) => {
    await deleteSession(sessionId);
    await loadData();
  };

  const handleRecoverQueue = async () => {
    await recoverQueue();
    await loadData();
  };

  const loadData = async () => {
    try {
      setError('');
      const [sessionData, jobData, queueData] = await Promise.all([
        listSessions(),
        listJobs(),
        getQueueHealth(),
      ]);
      setSessions(sessionData);
      setJobs(jobData);
      setQueueHealth(queueData);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!activeJobs.length || manualRefreshOnly) return undefined;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setManualRefreshOnly(true);
        clearInterval(timer);
        return;
      }
      await loadData();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [activeJobs.length, manualRefreshOnly]);

  return (
    <section className="page-shell sessions-page">
      <div className="page-header-row sessions-page-header">
        <div>
          <h1>Sessions</h1>
          <p>Import session recordings and monitor processing jobs.</p>
        </div>
        <div className="row-actions sessions-page-actions">
          {activeJobs.length ? (
            <button type="button" onClick={handleRecoverQueue} className="secondary-link">
              Recover Queue
            </button>
          ) : null}
          {manualRefreshOnly ? (
            <button type="button" onClick={loadData} className="secondary-link">
              Refresh
            </button>
          ) : null}
          <Link to="/sessions/import" className="primary-link">
            Import Session
          </Link>
        </div>
      </div>

      {loading ? <p>Loading sessions...</p> : null}
      {error ? <p className="job-error">{error}</p> : null}
      {manualRefreshOnly ? (
        <p className="helper-text">
          Auto-refresh timed out. Use manual refresh to continue monitoring.
        </p>
      ) : null}
      {activeJobs.length && queueHealth && !queueHealth.hasWorker ? (
        <p className="job-error">
          No background worker detected. Jobs will remain queued until a worker is running.
        </p>
      ) : null}

      <div className="page-grid sessions-page-grid">
        <div className="page-panel sessions-page-panel">
          <h2>Completed Sessions</h2>
          <SessionList sessions={sessions} jobs={jobs} onDelete={handleDeleteSession} />
        </div>
        <div className="page-panel sessions-page-panel">
          <h2>Processing Jobs</h2>
          <JobList jobs={jobs} onCancel={handleCancelJob} />
        </div>
      </div>
    </section>
  );
};

export default SessionsPage;

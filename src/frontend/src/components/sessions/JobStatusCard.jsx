import { Link, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const STATUS_CLASS = {
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

/** Display progress: completed => 100%, failed => actual or 0, else job.progress. */
const getDisplayProgress = (job) => {
  if (job.status === 'completed') return 100;
  if (job.status === 'failed') return typeof job.progress === 'number' ? job.progress : 0;
  return typeof job.progress === 'number' ? Math.min(100, Math.max(0, job.progress)) : 0;
};

const JobStatusCard = ({ job, onCancel, showViewJob = true }) => {
  const navigate = useNavigate();
  const statusClass = STATUS_CLASS[job.status] ?? 'queued';
  const canCancel = job.status === 'queued' || job.status === 'running';
  const displayProgress = getDisplayProgress(job);

  const handleCardClick = (e) => {
    if (e.target.closest('a, button')) return;
    navigate(`/jobs/${job.id}`);
  };

  return (
    <article
      className="job-status-card"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!e.target.closest('a, button')) navigate(`/jobs/${job.id}`);
        }
      }}
    >
      <div className="job-status-card-header">
        <p className="job-identifier job-identifier-inline">
          Job ID: <span className="job-id-value">{job.id}</span>
        </p>
        <span className={`status-badge ${statusClass}`}>{job.status}</span>
      </div>

      <div className="job-status-meta">
        <p>Created: {formatDate(job.createdAt)}</p>
        <p>Updated: {formatDate(job.updatedAt)}</p>
        {job.status === 'completed' && job.sessionId ? (
          <p className="session-identifier" title="Matches this session in Completed Sessions.">
            Session: <Link to={`/sessions/${job.sessionId}`} onClick={(e) => e.stopPropagation()} className="secondary-link">{job.sessionId}</Link>
          </p>
        ) : null}
      </div>

      <div className="inline-progress">
        <div className="inline-progress-track">
          <div className="inline-progress-fill" style={{ width: `${displayProgress}%` }} />
        </div>
        <span>{Math.round(displayProgress)}%</span>
      </div>

      {job.error && <p className="job-error">{job.error}</p>}

      <div className="job-actions">
        {canCancel && onCancel ? (
          <button
            type="button"
            className="job-cancel-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(job.id);
            }}
            title="Cancel job"
          >
            <XCircle size={16} />
            Cancel
          </button>
        ) : null}
        {showViewJob ? (
          <Link to={`/jobs/${job.id}`} className="secondary-link" onClick={(e) => e.stopPropagation()}>
            View Job
          </Link>
        ) : null}
        {job.status === 'completed' && job.sessionId ? (
          <Link to={`/sessions/${job.sessionId}`} className="primary-link" onClick={(e) => e.stopPropagation()}>
            View Session
          </Link>
        ) : null}
      </div>
    </article>
  );
};

export default JobStatusCard;

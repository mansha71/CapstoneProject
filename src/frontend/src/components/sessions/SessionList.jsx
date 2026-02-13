import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import EmptyState from './EmptyState';

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

/** Resolve job identifier for a session: job id if job still exists, or "deleted" if job was removed. */
const getJobIdentifier = (session, jobs) => {
  if (!session.relatedJobId) return null;
  const jobExists = jobs?.some((j) => j.id === session.relatedJobId);
  return jobExists ? { jobId: session.relatedJobId, deleted: false } : { jobId: session.relatedJobId, deleted: true };
};

const SessionList = ({ sessions, jobs = [], onDelete }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this session? This will remove the video and all processing results.')) return;
    try {
      setDeleting(sessionId);
      await onDelete(sessionId);
    } catch (err) {
      alert(err.message || 'Failed to delete session');
    } finally {
      setDeleting(null);
    }
  };

  if (!sessions.length) {
    return (
      <EmptyState
        title="No completed sessions yet"
        description="Import a recording to start a processing job and generate a dashboard session."
      />
    );
  }

  return (
    <div className="sessions-list">
      {sessions.map((session) => {
        const jobInfo = getJobIdentifier(session, jobs);
        return (
          <Link to={`/sessions/${session.sessionId}`} key={session.sessionId} className="session-row">
            <div className="session-row-left">
              <h4>{session.name || session.sessionName || session.sessionId}</h4>
              <p className="session-id-meta">Session: {session.sessionId}</p>
              {jobInfo ? (
                jobInfo.deleted ? (
                  <p className="job-identifier job-deleted" title="The processing job for this session was removed or cancelled.">
                    Job: {jobInfo.jobId} (no longer available)
                  </p>
                ) : (
                  <p className="job-identifier">
                    Job: <Link to={`/jobs/${jobInfo.jobId}`} onClick={(e) => e.stopPropagation()} className="secondary-link">{jobInfo.jobId}</Link>
                  </p>
                )
              ) : null}
            </div>
            <div className="session-row-right">
              <p>{formatDate(session.startedAt || session.startTime)}</p>
              <div className="session-row-actions">
                {onDelete ? (
                  <button
                    type="button"
                    className="session-delete-btn"
                    onClick={(e) => handleDelete(e, session.sessionId)}
                    disabled={deleting === session.sessionId}
                    title="Delete session"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
                <span className="primary-link">View Session</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default SessionList;

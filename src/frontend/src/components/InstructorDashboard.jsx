import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

import Metrics from './Metrics';
import SessionInfo from './SessionInfo';
import InstructorMovementMetrics from './InstructorMovementMetrics';
import ProcessingInfoCard from './ProcessingInfoCard';
import InstructorOverlayCanvas from './overlay/InstructorOverlayCanvas';
import { deleteSession, getSession } from '../services/sessions';
import { getJob } from '../services/jobs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const InstructorDashboard = () => {
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionResource, setSessionResource] = useState(null);
  const [relatedJob, setRelatedJob] = useState(null);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [showBBox, setShowBBox] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showCoordinateLabels, setShowCoordinateLabels] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const handleDeleteSession = async () => {
    if (!confirm('Delete this session? This will remove the video and all processing results.')) return;
    try {
      setDeleting(true);
      await deleteSession(sessionId);
      navigate('/sessions');
    } catch (err) {
      alert(err.message || 'Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const resource = await getSession(sessionId);
        if (!mounted) return;
        setSessionResource(resource);
        if (resource?.relatedJobId) {
          const job = await getJob(resource.relatedJobId);
          if (mounted) setRelatedJob(job);
        } else {
          setRelatedJob(null);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || 'Unable to load session dashboard');
          setSessionResource(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const processingStatus = sessionResource?.processing?.status ?? relatedJob?.status ?? 'completed';
  const hasTracking = Boolean(sessionResource?.tracking);
  const hasVideo = Boolean(sessionResource?.media?.centralCamUrl);
  const sessionMeta = sessionResource?.session;
  const videoPath = sessionResource?.media?.centralCamUrl ?? null;
  // Construct full video URL using API base URL (backend returns path like /sessions/.../media/video)
  // If videoPath is already a full URL (starts with http:// or https://), use it as-is
  const videoUrl = videoPath
    ? videoPath.startsWith('http://') || videoPath.startsWith('https://')
      ? videoPath
      : `${API_BASE_URL}${videoPath}`
    : null;
  const tracking = sessionResource?.tracking ?? null;

  return (
    <div className="instructor-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <h1 className="dashboard-title">Instructor Dashboard</h1>
          <div className="dashboard-header-actions">
            <SessionInfo
              sessionName={sessionMeta?.name || sessionMeta?.sessionName || 'Unknown Session'}
              sessionId={sessionMeta?.sessionId || sessionId}
              sessionDate={sessionMeta?.startedAt || sessionMeta?.startTime || sessionMeta?.sessionDate}
            />
            <button
              type="button"
              className="dashboard-delete-btn"
              onClick={handleDeleteSession}
              disabled={deleting}
              title="Delete session"
            >
              <Trash2 size={20} />
              {/* Delete Session */}
            </button>
          </div>
        </div>
        <p className="dashboard-subtitle">
          Review post-processed instructor tracking. Use the sidebar to toggle overlays.
        </p>
      </div>
      <div className="dashboard-content">
        {loading ? <p>Loading session results...</p> : null}
        {error ? <p className="job-error">{error}</p> : null}

        {!loading && !error && processingStatus !== 'failed' && !hasTracking && !hasVideo ? (
          <div className="dashboard-state-card">
            <h3>Processing in progress</h3>
            <p>
              Results are not available yet. We will show the video and tracking once
              post-processing completes.
            </p>
            {sessionResource?.relatedJobId ? (
              <Link to={`/jobs/${sessionResource.relatedJobId}`} className="primary-link">
                View Processing Job
              </Link>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && processingStatus === 'failed' ? (
          <div className="dashboard-state-card">
            <h3>Processing failed</h3>
            <p>{sessionResource?.processing?.error || 'The job did not complete successfully.'}</p>
            <p className="helper-text">Try re-uploading the recording or rerunning processing.</p>
            <Link to="/sessions/import" className="primary-link">
              Re-upload Session
            </Link>
          </div>
        ) : null}

        {!loading && !error && processingStatus !== 'failed' && (hasTracking || hasVideo) ? (
          <div className="dashboard-sections">
            {(!hasVideo || !hasTracking) && (
              <div className="dashboard-state-card partial">
                <p className="helper-text">
                  Partial results: {hasTracking ? 'tracking ready, video missing.' : 'video ready, tracking missing.'}
                </p>
              </div>
            )}

            <div className="dashboard-main-row">
              <div className="dashboard-video-section">
                <div className="dashboard-video-card">
                  <div className="heatmap-player-wrapper overlay-host">
                    <div className="video-player">
                      {videoUrl ? (
                        <>
                          <video
                            src={videoUrl}
                            className="heatmap-video"
                            controls
                            preload="metadata"
                            crossOrigin="anonymous"
                            onTimeUpdate={(e) => setCurrentTimeSec(e.target.currentTime)}
                          />
                          <InstructorOverlayCanvas
                            tracking={tracking}
                            currentTimeSec={currentTimeSec}
                            showBBox={showBBox}
                            showTrail={showTrail}
                            showCoordinateLabels={showCoordinateLabels}
                          />
                        </>
                      ) : (
                        <div className="video-placeholder">
                          <div className="placeholder-content">
                            <p>Session video unavailable</p>
                            <span className="placeholder-note">Processing may still be running or the file is missing.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="dashboard-sidebar">
                <h3 className="dashboard-sidebar-title">Overlays</h3>
                <h4 className="dashboard-sidebar-section-title">Instructor coordinates</h4>
                <div className="dashboard-sidebar-toggles">
                  <label className="dashboard-toggle">
                    <input
                      type="checkbox"
                      checked={showBBox}
                      onChange={() => setShowBBox((v) => !v)}
                    />
                    <span>Bounding box</span>
                  </label>
                  <label className="dashboard-toggle">
                    <input
                      type="checkbox"
                      checked={showTrail}
                      onChange={() => setShowTrail((v) => !v)}
                    />
                    <span>Track trail</span>
                  </label>
                  <label className="dashboard-toggle">
                    <input
                      type="checkbox"
                      checked={showCoordinateLabels}
                      onChange={() => setShowCoordinateLabels((v) => !v)}
                    />
                    <span>Coordinate labels</span>
                  </label>
                  <label className="dashboard-toggle disabled">
                    <input type="checkbox" disabled />
                    <span>Homography</span>
                    <span className="dashboard-toggle-badge">Coming soon</span>
                  </label>
                </div>
              </aside>
            </div>

            <div className="dashboard-info-section">
              <InstructorMovementMetrics
                metrics={tracking?.derivedMetrics ?? null}
                tracking={tracking}
                currentTimeSec={currentTimeSec}
              />
              <ProcessingInfoCard
                processing={sessionResource?.processing ?? null}
                tracking={tracking}
              />
            </div>
          </div>
        ) : null}

        <Metrics
          isExpanded={metricsExpanded}
          onToggleExpand={() => setMetricsExpanded(!metricsExpanded)}
          analyticsDetail={sessionResource?.analyticsDetail ?? null}
        />
      </div>
    </div>
  );
};

export default InstructorDashboard;

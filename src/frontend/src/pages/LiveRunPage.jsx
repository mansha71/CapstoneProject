import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import CentralCamPanel from '../components/live/CentralCamPanel';
import GazeOverlayCanvas from '../components/live/GazeOverlayCanvas';
import GazePointsList from '../components/live/GazePointsList';
import SessionControlsCard from '../components/live/SessionControlsCard';
import { createLiveProvider } from '../providers/live/createLiveProvider';

const MAX_GAZE_POINTS = 200;
const TOAST_DISMISS_MS = 2500;

const createLiveRunId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `live-${Date.now()}`;
};

const formatDuration = (durationMs) => {
  if (!durationMs || durationMs < 0) return '00:00';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getConnectionLabel = (connected) => (connected ? 'Live (Connected)' : 'Live (Not Connected)');
const getStatusLabel = (status) => (status === 'running' ? 'Running' : status === 'ended' ? 'Ended' : 'Idle');

const LiveRunPage = () => {
  const location = useLocation();
  const draftConfig = location.state?.draftConfig ?? {};
  const providerRef = useRef(createLiveProvider());
  const provider = providerRef.current;

  const [liveRunId] = useState(createLiveRunId);
  const [providerState, setProviderState] = useState(provider.getState());
  const [gazePoints, setGazePoints] = useState([]);
  const [showGazePoints, setShowGazePoints] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [pendingAction, setPendingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    let mounted = true;
    provider.connect().catch(() => {
      // In stub mode we intentionally stay disconnected.
    });

    const unsubscribeStatus = provider.onStatus((state) => {
      if (!mounted) return;
      setProviderState(state);
    });
    const unsubscribeGaze = provider.onGazePoint((event) => {
      if (!mounted) return;
      setGazePoints((current) => [...current, event].slice(-MAX_GAZE_POINTS));
    });

    setProviderState(provider.getState());
    return () => {
      mounted = false;
      unsubscribeStatus();
      unsubscribeGaze();
      provider.disconnect();
    };
  }, [provider]);

  useEffect(() => {
    if (providerState.status !== 'running') {
      setNowMs(Date.now());
      return undefined;
    }

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [providerState.status]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = setTimeout(() => setToastMessage(''), TOAST_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const elapsedMs = useMemo(() => {
    if (providerState.status !== 'running') return 0;
    if (!providerState.statusSinceMs) return 0;
    return Math.max(0, nowMs - providerState.statusSinceMs);
  }, [providerState.status, providerState.statusSinceMs, nowMs]);

  const showError = (error) => {
    setToastMessage(error?.message || 'Live backend not connected');
  };

  const handleStartSession = async () => {
    try {
      setPendingAction(true);
      await provider.startSession(liveRunId);
    } catch (error) {
      showError(error);
    } finally {
      setPendingAction(false);
    }
  };

  const handleEndSession = async () => {
    try {
      setPendingAction(true);
      await provider.endSession(liveRunId);
    } catch (error) {
      showError(error);
    } finally {
      setPendingAction(false);
    }
  };

  return (
    <section className="page-shell live-run-page">
      <div className="live-session-header">
        <div>
          <h1>Real-Time Session Run</h1>
          <p className="helper-text">Live Run ID: {liveRunId || 'Current Live Run'}</p>
          <p className="helper-text">Live streaming not implemented yet.</p>
        </div>
        <div className="live-header-meta">
          <span className={`status-badge ${providerState.connected ? 'completed' : 'queued'}`}>
            {getConnectionLabel(providerState.connected)}
          </span>
          <span className={`status-badge live-status-pill ${providerState.status}`}>
            {getStatusLabel(providerState.status)}
          </span>
          <span className="live-timer">Timer: {formatDuration(elapsedMs)}</span>
        </div>
      </div>

      <div className="row-actions live-run-actions">
        <Link to="/live" className="secondary-link">Back to Live Setup</Link>
        <div className="live-run-actions-right">
          <button
            type="button"
            className="primary-link"
            onClick={handleStartSession}
            disabled={pendingAction}
          >
            Start Session
          </button>
          <button
            type="button"
            className="secondary-link"
            onClick={handleEndSession}
            disabled={pendingAction}
          >
            End Session
          </button>
        </div>
      </div>

      <div className="live-run-top-row">
        <div className="live-side-card">
          <h3>Draft Configuration</h3>
          <p className="helper-text">Course: {draftConfig.courseName || '—'}</p>
          <p className="helper-text">Room: {draftConfig.room || '—'}</p>
          <p className="helper-text">Camera source: {draftConfig.cameraSource || '—'}</p>
        </div>
        <SessionControlsCard
          status={providerState.status}
          connected={providerState.connected}
          lastMessageAt={providerState.lastMessageAt}
        />
      </div>

      <div className="live-camera-row">
        <div className="live-video-card overlay-host">
          <CentralCamPanel connected={providerState.connected} mediaStream={null} streamUrl={null} />
          <GazeOverlayCanvas
            points={gazePoints}
            showGazePoints={showGazePoints}
            showHeatmap={showHeatmap}
          />
        </div>
      </div>

      <div className="live-bottom-row">
        <div className="live-overlay-column">
          <section className="live-side-card live-overlay-panel">
            <h3 className="live-panel-title">Overlays</h3>
            <div className="dashboard-sidebar-toggles live-overlay-toggles">
              <label className="dashboard-toggle live-toggle">
                <input
                  type="checkbox"
                  checked={showGazePoints}
                  onChange={() => setShowGazePoints((prev) => !prev)}
                />
                <span>Gaze points</span>
              </label>
              <label className="dashboard-toggle live-toggle">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={() => setShowHeatmap((prev) => !prev)}
                />
                <span>Heatmap</span>
              </label>
            </div>
          </section>
          <GazePointsList points={gazePoints} />
        </div>
      </div>

      {toastMessage ? <div className="live-toast">{toastMessage}</div> : null}
    </section>
  );
};

export default LiveRunPage;

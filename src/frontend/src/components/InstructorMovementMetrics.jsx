import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import InfoModal from './InfoModal';

const nearestTrackPoint = (trackPoints, currentTimeMs) => {
  if (!trackPoints?.length) return null;
  return trackPoints.reduce((closest, point) => {
    if (!closest) return point;
    const currentDelta = Math.abs(point.tMs - currentTimeMs);
    const bestDelta = Math.abs(closest.tMs - currentTimeMs);
    return currentDelta < bestDelta ? point : closest;
  }, null);
};

const nearestFrameDetection = (frameDetections, currentTimeMs) => {
  if (!frameDetections?.length) return null;
  return frameDetections.reduce((closest, frame) => {
    if (!closest) return frame;
    const currentDelta = Math.abs(frame.tMs - currentTimeMs);
    const bestDelta = Math.abs(closest.tMs - currentTimeMs);
    return currentDelta < bestDelta ? frame : closest;
  }, null);
};

const InstructorMovementMetrics = ({ metrics, tracking, currentTimeSec = 0 }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  if (!metrics) return null;
  const currentTimeMs = Math.round(currentTimeSec * 1000);
  const activePoint = nearestTrackPoint(tracking?.trackPoints, currentTimeMs);
  const activeFrame = nearestFrameDetection(tracking?.frameDetections, currentTimeMs);
  const activeBox = activeFrame?.bbox ?? null;
  const hasActivePoint = Boolean(activePoint);
  const coordinateLabel =
    tracking?.coordinateSystem === 'pixels'
      ? `${Math.round(activePoint?.cx ?? 0)}, ${Math.round(activePoint?.cy ?? 0)}`
      : `${(activePoint?.cx ?? 0).toFixed(3)}, ${(activePoint?.cy ?? 0).toFixed(3)}`;
  const bboxLabel = (() => {
    if (!activeBox) return 'N/A';
    const x1 = activeBox.x;
    const y1 = activeBox.y;
    const x2 = activeBox.x + activeBox.w;
    const y2 = activeBox.y + activeBox.h;
    const format = (value) =>
      tracking?.coordinateSystem === 'pixels' ? `${Math.round(value)}` : value.toFixed(3);
    return `TL(${format(x1)}, ${format(y1)}) TR(${format(x2)}, ${format(y1)}) BL(${format(x1)}, ${format(y2)}) BR(${format(x2)}, ${format(y2)})`;
  })();

  return (
    <section className="metrics-container">
      <div className="metrics-header">
        <h2 className="metrics-title">
          <Activity size={24} style={{ marginRight: '0.5rem' }} />
          Instructor Movement Metrics
        </h2>
        <div className="metrics-header-actions">
          {isExpanded ? (
            <button
              type="button"
              className="metrics-info-btn"
              aria-label="Explain instructor movement metrics"
              onClick={() => setShowHelp(true)}
            >
              <Info size={20} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="metrics-collapse-btn"
            aria-label={isExpanded ? 'Collapse instructor movement metrics' : 'Expand instructor movement metrics'}
            onClick={() => {
              if (isExpanded) setShowHelp(false);
              setIsExpanded((v) => !v);
            }}
          >
            {isExpanded ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {isExpanded ? (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3 className="metric-card-title">Coverage</h3>
              <p className="metric-value">{Math.round((metrics.coverage ?? 0) * 100)}%</p>
            </div>
            <div className="metric-card">
              <h3 className="metric-card-title">Gaps</h3>
              <p className="metric-value">{metrics.gapCount ?? 0}</p>
            </div>
            <div className="metric-card">
              <h3 className="metric-card-title">Longest Gap</h3>
              <p className="metric-value">{((metrics.longestGapMs ?? 0) / 1000).toFixed(1)}s</p>
            </div>
            <div className="metric-card">
              <h3 className="metric-card-title">Total Distance</h3>
              <p className="metric-value">{Math.round(metrics.distance ?? 0)} px</p>
            </div>
            {typeof metrics.jitter === 'number' ? (
              <div className="metric-card">
                <h3 className="metric-card-title">Jitter</h3>
                <p className="metric-value">{metrics.jitter.toFixed(3)}</p>
              </div>
            ) : null}
            <div className="metric-card">
              <h3 className="metric-card-title">Current Coordinates</h3>
              <p className="metric-value">{hasActivePoint ? coordinateLabel : 'N/A'}</p>
            </div>
            <div className="metric-card">
              <h3 className="metric-card-title">Point Quality</h3>
              <p className="metric-value">{activePoint?.quality ?? 'N/A'}</p>
            </div>
            <div className="metric-card">
              <h3 className="metric-card-title">Instructor BBox Corners</h3>
              <p className="metric-value">{bboxLabel}</p>
            </div>
          </div>
          <InfoModal
            isOpen={showHelp}
            title="Metrics Definitions"
            ariaLabel="Instructor movement metrics definitions"
            onClose={() => setShowHelp(false)}
          >
            <p><strong>Coverage:</strong> Percent of timeline where instructor position is available (measured or interpolated).</p>
            <p><strong>Gaps:</strong> Number of distinct missing-position segments during playback.</p>
            <p><strong>Longest Gap:</strong> Duration of the longest missing-position segment.</p>
            <p><strong>Total Distance:</strong> Sum of movement between consecutive instructor points.</p>
            <p><strong>Jitter:</strong> Variability of frame-to-frame movement magnitude (higher means less smooth movement).</p>
            <p><strong>Current Coordinates:</strong> Instructor centroid position at the current video time.</p>
            <p><strong>Point Quality:</strong> Whether current point is measured, interpolated, or lost.</p>
            <p><strong>Instructor BBox Corners:</strong> Bounding box corner coordinates (top-left, top-right, bottom-left, bottom-right).</p>
          </InfoModal>
        </>
      ) : null}
    </section>
  );
};

export default InstructorMovementMetrics;

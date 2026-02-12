import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Info } from 'lucide-react';
import InfoModal from './InfoModal';

const ProcessingInfoCard = ({ processing, tracking }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const detector = processing?.detector || tracking?.processingMeta?.detector || 'Unknown';
  const tracker = processing?.tracker || tracking?.processingMeta?.tracker || 'Unknown';
  const runtime = tracking?.processingMeta?.detectorRuntime || null;
  const detectorVersion = tracking?.processingMeta?.detectorVersion || null;
  const modelSource = tracking?.processingMeta?.modelSource || null;
  const label = 'Post-processed (not real-time)';

  return (
    <section className="metrics-container">
      <div className="metrics-header">
        <h2 className="metrics-title">
          <Cpu size={24} style={{ marginRight: '0.5rem' }} />
          Processing Info
        </h2>
        <div className="metrics-header-actions">
          {isExpanded ? (
            <button
              type="button"
              className="metrics-info-btn"
              aria-label="Explain processing info fields"
              onClick={() => setShowHelp(true)}
            >
              <Info size={20} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="metrics-collapse-btn"
            aria-label={isExpanded ? 'Collapse processing info' : 'Expand processing info'}
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
          <div className="processing-info-grid">
            <div className="metric-row">
              <span className="metric-label">Detector</span>
              <span className="metric-value">
                {detector}
                {runtime ? ` (${runtime})` : ''}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Tracker</span>
              <span className="metric-value">{tracker}</span>
            </div>
            {detectorVersion ? (
              <div className="metric-row">
                <span className="metric-label">Detector version</span>
                <span className="metric-value">{detectorVersion}</span>
              </div>
            ) : null}
            {modelSource ? (
              <div className="metric-row">
                <span className="metric-label">Model source</span>
                <span className="metric-value">{modelSource}</span>
              </div>
            ) : null}
            <div className="metric-row">
              <span className="status-badge running">{label}</span>
            </div>
          </div>
          <InfoModal
            isOpen={showHelp}
            title="Processing Info Definitions"
            ariaLabel="Processing info definitions"
            onClose={() => setShowHelp(false)}
          >
            <p><strong>Detector:</strong> Model used to find people in each processed frame.</p>
            <p><strong>Detector runtime:</strong> Inference backend/device used for running the detector.</p>
            <p><strong>Tracker:</strong> Logic used to keep the instructor identity consistent over time.</p>
            <p><strong>Detector version:</strong> Version of the detector library/model runtime for reproducibility.</p>
            <p><strong>Model source:</strong> Framework/source providing the detector model weights.</p>
            <p><strong>Post-processed:</strong> Results are computed after upload; not real-time.</p>
          </InfoModal>
        </>
      ) : null}
    </section>
  );
};

export default ProcessingInfoCard;

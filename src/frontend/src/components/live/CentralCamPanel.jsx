import { useEffect, useRef } from 'react';

const CentralCamPanel = ({ connected, streamUrl = null, mediaStream = null }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = mediaStream ?? null;
  }, [mediaStream]);

  const hasSource = Boolean(mediaStream || streamUrl);

  return (
    <section className="live-central-cam-panel">
      <h2>Central Camera</h2>
      <div className="live-video-shell">
        <div className="video-player live-video-player">
          {hasSource ? (
            <video
              ref={videoRef}
              src={mediaStream ? undefined : streamUrl ?? undefined}
              className="heatmap-video"
              autoPlay
              muted
              playsInline
              controls
            />
          ) : (
            <div className="video-placeholder live-video-placeholder">
              <div className="placeholder-content">
                <p>No live stream connected</p>
                <span className="placeholder-note">
                  {connected ? 'Waiting for central camera frames...' : 'Connect a live source to view camera feed.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CentralCamPanel;

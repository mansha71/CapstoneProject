const Heatmap = ({ videoUrl = null }) => {
  const hasVideo = Boolean(videoUrl);
  return (
    <div className="heatmap-container">
      <div className="metrics-header">
        <h2 className="metrics-title">Heatmap</h2>
      </div>

      <div className="heatmap-player-wrapper">
        {hasVideo ? (
          <video
            src={videoUrl}
            className="heatmap-video"
            controls
            preload="metadata"
          />
        ) : (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <p>Heatmap video unavailable</p>
              <span className="placeholder-note">Processing may still be running.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Heatmap;

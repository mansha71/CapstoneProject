import heatmapVideo from "../assets/output.mp4";

const Heatmap = () => {
  return (
    <div className="heatmap-container">
      <div className="metrics-header">
        <h2 className="metrics-title">Heatmap</h2>
      </div>

      <div className="heatmap-player-wrapper">
        <video
          src={heatmapVideo}
          className="heatmap-video"
          controls
          autoPlay
          loop
          muted
          onError={(e) => {
            const video = e.target;
            console.error("Video loading error:", video.error);
            console.error("Attempted URL:", video.currentSrc);
          }}
        />
      </div>
    </div>
  );
};

export default Heatmap;

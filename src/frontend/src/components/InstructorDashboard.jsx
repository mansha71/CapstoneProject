import { useState } from 'react';

import Metrics from './Metrics';
import SessionInfo from './SessionInfo';
import MediaPanel from './MediaPanel';

const InstructorDashboard = () => {
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  return (
    <div className="instructor-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <h1 className="dashboard-title">Instructor Dashboard</h1>
          <SessionInfo />
        </div>
        <p className="dashboard-subtitle">Monitor student engagement and session analytics</p>
      </div>
      <div className="dashboard-content">
        {/* Add url of the heatmap video, central cam video, and slide deck video here */}
        <MediaPanel
          heatmapVideoUrl="/media/visualize_centralonly_heatmap.mp4"
          centralCamUrl="/media/output_video.mp4"
          slideDeckUrl="/media/slides.mov"
        />
        <Metrics
          isExpanded={metricsExpanded}
          onToggleExpand={() => setMetricsExpanded(!metricsExpanded)}
        />
      </div>
    </div>
  );
};

export default InstructorDashboard;


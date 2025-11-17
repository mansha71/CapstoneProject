import { useState } from 'react';

import Metrics from './Metrics';
import SessionInfo from './SessionInfo';

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
        {/* Metrics component - can be used elsewhere too */}
        <Metrics 
          isExpanded={metricsExpanded}
          onToggleExpand={() => setMetricsExpanded(!metricsExpanded)}
        />
      </div>
    </div>
  );
};

export default InstructorDashboard;


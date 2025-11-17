import { useState } from 'react';

import Metrics from './Metrics';

const InstructorDashboard = () => {
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  return (
    <div className="instructor-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Instructor Dashboard</h1>
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


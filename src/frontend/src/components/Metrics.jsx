import { useState } from 'react';

import { ChevronDown, ChevronUp, Eye, Monitor, User, AlertCircle, CheckCircle, XCircle, BarChart3, Clock, TrendingUp, Activity, Mic, MicOff } from 'lucide-react';
import AttentionPlayer from './AttentionPlayer';

// Utility functions
const getFocusColor = (percentage) => {
  if (percentage >= 75) return '#10b981'; // green
  if (percentage >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

const getFocusLabel = (percentage) => {
  if (percentage >= 75) return 'High';
  if (percentage >= 50) return 'Medium';
  return 'Low';
};

// Distinct colors for different objects
const getObjectColor = (index) => {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // green
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#ef4444', // red
  ];
  return colors[index % colors.length];
};

// Mock data - replace with real data when backend is ready
const mockData = {
  // Core Metrics
  currentFocus: 76,
  focusDistribution: {
    screen: 52,
    instructor: 24,
    offScreen: 24
  },
  learningScore: {
    value: 0.78,
    slideNumber: 5
  },
  deviceStatus: {
    active: 27,
    warning: 2,
    offline: 1,
    total: 30
  },
  // Secondary Metrics
  focusOverTime: {
    average: 68,
    highFocusDuration: 12, // minutes
    lowFocusDuration: 7, // minutes
    distribution: {
      high: 30,
      medium: 45,
      low: 25
    },
    // Sparkline data - array of focus percentages over time
    sparklineData: [40, 60, 80, 55, 70, 65, 75, 68, 72, 58, 65, 70]
  },
  slidePerformance: {
    currentSlide: {
      avgAttention: 73,
      timeSpent: '2m 15s',
      sessionAvg: '1m 40s'
    },
    bestSlide: { number: 7, score: 0.89 },
    worstSlide: { number: 3, score: 0.42 }
  },
  objectAttention: [
    { name: 'Graph', attention: 45 },
    { name: 'Text block', attention: 30 },
    { name: 'Image', attention: 25 }
  ],
  sessionHealth: {
    validDataPercent: 94,
    avgActiveDevices: 26.4,
    maxDropout: 4
  },
  audio: {
    talkingDuration: 18, // minutes
    silenceDuration: 5, // minutes
    slidesWithSpeech: 85 // percentage
  }
};

// Subcomponents
const MetricCard = ({ title, children, className = '' }) => (
  <div className={`metric-card ${className}`}>
    <h3 className="metric-card-title">{title}</h3>
    <div className="metric-card-content">{children}</div>
  </div>
);

const MetricRow = ({ label, value, icon: Icon, color }) => (
  <div className="metric-row">
    {Icon && <Icon size={18} className="metric-icon" style={{ color }} />}
    <span className="metric-label">{label}</span>
    <span className="metric-value" style={{ color }}>{value}</span>
  </div>
);

const FocusSummaryCard = ({ data }) => (
  <MetricCard title="Current Focus">
    <div className="focus-display">
      <div 
        className="focus-circle"
        style={{ 
          color: getFocusColor(data.currentFocus),
          borderColor: getFocusColor(data.currentFocus)
        }}
      >
        <Eye size={32} />
        <div className="focus-percentage">{data.currentFocus}%</div>
      </div>
      <div 
        className="focus-label"
        style={{ color: getFocusColor(data.currentFocus) }}
      >
        {getFocusLabel(data.currentFocus)} focus
      </div>
    </div>
  </MetricCard>
);

const FocusDistributionCard = ({ data }) => (
  <MetricCard title="Focus Distribution">
    <div className="distribution-list">
      <MetricRow 
        label="Screen" 
        value={`${data.focusDistribution.screen}%`}
        icon={Monitor}
        color="#3b82f6"
      />
      <MetricRow 
        label="Instructor" 
        value={`${data.focusDistribution.instructor}%`}
        icon={User}
        color="#8b5cf6"
      />
      <MetricRow 
        label="Off-screen" 
        value={`${data.focusDistribution.offScreen}%`}
        icon={Eye}
        color="#64748b"
      />
    </div>
  </MetricCard>
);

const LearningScoreCard = ({ data }) => (
  <MetricCard title="Learning Score">
    <div className="learning-score-display">
      <div className="score-value">{data.learningScore.value.toFixed(2)}</div>
      <div className="score-label">Slide {data.learningScore.slideNumber}</div>
      <div className="score-bar">
        <div 
          className="score-bar-fill"
          style={{ 
            width: `${data.learningScore.value * 100}%`,
            backgroundColor: getFocusColor(data.learningScore.value * 100)
          }}
        />
      </div>
    </div>
  </MetricCard>
);

const FocusOverTimeCard = ({ data }) => {
  const sparklineData = data.focusOverTime.sparklineData || [];
  const axisLabels = [100, 75, 50, 25, 0];
  const SPARKLINE_HEIGHT = 300; // Match the axis height
  
  return (
    <MetricCard title="Focus Over Time" className="full-width">
      <div className="metrics-subgrid">
        <div>
          <MetricRow label="Average Focus" value={`${data.focusOverTime.average}%`} />
          <MetricRow label="High Focus (>75%)" value={`${data.focusOverTime.highFocusDuration} min`} />
          <MetricRow label="Low Focus (<40%)" value={`${data.focusOverTime.lowFocusDuration} min`} />
        </div>
        <div>
          <h4 className="sub-metric-title">Focus Distribution</h4>
          <MetricRow label="High" value={`${data.focusOverTime.distribution.high}%`} color="#10b981" />
          <MetricRow label="Medium" value={`${data.focusOverTime.distribution.medium}%`} color="#f59e0b" />
          <MetricRow label="Low" value={`${data.focusOverTime.distribution.low}%`} color="#ef4444" />
        </div>
      </div>
      {sparklineData.length > 0 && (
        <div className="focus-sparkline-container">
          <div className="sparkline-wrapper">
            <div className="sparkline-axis">
              {axisLabels.map((label) => (
                <div key={label} className="axis-label">{label}%</div>
              ))}
            </div>
            <div 
              className="focus-sparkline"
              style={{ height: `${SPARKLINE_HEIGHT}px` }}
            >
              {sparklineData.map((value, i) => (
                <div 
                  key={i} 
                  className="focus-bar"
                  style={{ 
                    height: `${(value / 100) * SPARKLINE_HEIGHT}px`,
                    backgroundColor: getFocusColor(value)
                  }}
                  title={`${value}%`}
                />
              ))}
            </div>
          </div>
          <div className="sparkline-label">Focus trend over session</div>
        </div>
      )}
    </MetricCard>
  );
};

const SlidePerformanceCard = ({ data }) => (
  <MetricCard title="Slide Performance" className="full-width">
    <div className="metrics-subgrid">
      <div>
        <h4 className="sub-metric-title">Current Slide</h4>
        <MetricRow label="Avg Attention" value={`${data.slidePerformance.currentSlide.avgAttention}%`} />
        <MetricRow 
          label="Time Spent" 
          value={data.slidePerformance.currentSlide.timeSpent}
          icon={Clock}
        />
        <div className="metric-note">
          Session avg: {data.slidePerformance.currentSlide.sessionAvg}
        </div>
      </div>
      <div>
        <h4 className="sub-metric-title">Best & Worst</h4>
        <MetricRow 
          label="Best Slide" 
          value={`Slide ${data.slidePerformance.bestSlide.number} — ${data.slidePerformance.bestSlide.score.toFixed(2)}`}
          icon={TrendingUp}
          color="#10b981"
        />
        <MetricRow 
          label="Worst Slide" 
          value={`Slide ${data.slidePerformance.worstSlide.number} — ${data.slidePerformance.worstSlide.score.toFixed(2)}`}
          color="#ef4444"
        />
      </div>
    </div>
  </MetricCard>
);

const PerObjectAttentionCard = ({ data }) => {
  if (!data.objectAttention || data.objectAttention.length === 0) return null;
  
  // Calculate total for percentage normalization (in case it doesn't sum to 100)
  const total = data.objectAttention.reduce((sum, obj) => sum + obj.attention, 0);
  
  return (
    <MetricCard title="Per-Object Attention" className="full-width">
      <div className="object-attention-stacked">
        <div className="stacked-bar">
          {data.objectAttention.map((obj, idx) => {
            const widthPercent = total > 0 ? (obj.attention / total) * 100 : 0;
            return (
              <div
                key={idx}
                className="stacked-segment"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: getObjectColor(idx)
                }}
                title={`${obj.name}: ${obj.attention}%`}
              >
                {widthPercent > 10 && (
                  <span className="stacked-label">{obj.attention}%</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="stacked-legend">
          {data.objectAttention.map((obj, idx) => {
            return (
              <div key={idx} className="legend-item">
                <div 
                  className="legend-color"
                  style={{ backgroundColor: getObjectColor(idx) }}
                />
                <span className="legend-name">{obj.name}</span>
                <span className="legend-percentage">{obj.attention}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </MetricCard>
  );
};

const SessionHealthCard = ({ data }) => (
  <MetricCard title="Session Health / Data Quality" className="full-width">
    <div className="metrics-subgrid">
      <MetricRow label="Valid Data" value={`${data.sessionHealth.validDataPercent}%`} icon={Activity} />
      <MetricRow label="Avg Active Devices" value={data.sessionHealth.avgActiveDevices.toFixed(1)} />
      <MetricRow label="Max Dropout" value={`${data.sessionHealth.maxDropout} devices`} />
    </div>
  </MetricCard>
);

const AudioSegmentsCard = ({ data }) => (
  <MetricCard title="Speech/Audio Segments" className="full-width">
    <div className="metrics-subgrid">
      <MetricRow 
        label="Talking Duration" 
        value={`${data.audio.talkingDuration} min`}
        icon={Mic}
      />
      <MetricRow 
        label="Silence Duration" 
        value={`${data.audio.silenceDuration} min`}
        icon={MicOff}
      />
      <MetricRow 
        label="Slides with Speech" 
        value={`${data.audio.slidesWithSpeech}%`}
      />
    </div>
  </MetricCard>
);

const Metrics = ({ 
  isExpanded: externalExpanded = null,
  onToggleExpand: externalToggle = null,
  data = null
}) => {
  // Use external state if provided, otherwise use internal state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [futureMetricsExpanded, setFutureMetricsExpanded] = useState(false);
  
  const isExpanded = externalExpanded !== null ? externalExpanded : internalExpanded;
  const toggleExpand = externalToggle || (() => setInternalExpanded(!internalExpanded));
  
  // Use provided data or fall back to mock data
  const metrics = data || mockData;
  return (
    <div className="metrics-container">
      <div className="metrics-header">
        <h2 className="metrics-title">
          <BarChart3 size={24} style={{ marginRight: '0.5rem' }} />
          Session Metrics
        </h2>
        <button 
          className="metrics-toggle-btn"
          onClick={toggleExpand}
          title={isExpanded ? 'Collapse metrics' : 'Expand metrics'}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span>{isExpanded ? 'Less' : 'More'} Metrics</span>
        </button>
      </div>
      <div className="metrics-content">
        {/* CORE METRICS - Always visible */}
        <div className="metrics-section">
          <div className="metrics-grid">
            <FocusSummaryCard data={metrics} />
            <FocusDistributionCard data={metrics} />
            <LearningScoreCard data={metrics} />
          </div>
        </div>
        {/* SECONDARY METRICS - Only when expanded */}
        {isExpanded && (
          <div className="metrics-section expanded-section">
            {/* Attention Section */}
            <div className="secondary-metrics-group">
              <h4 className="secondary-group-title">Attention</h4>
              <FocusOverTimeCard data={metrics} />
            </div>
            {/* Slides Section */}
            <div className="secondary-metrics-group">
              <h4 className="secondary-group-title">Slides</h4>
              <SlidePerformanceCard data={metrics} />
              <PerObjectAttentionCard data={metrics} />
              <div className="attention-player-in-metrics">
                <AttentionPlayer />
              </div>
            </div>
            {/* Data Quality Section */}
            <div className="secondary-metrics-group">
              <h4 className="secondary-group-title">Data Quality</h4>
              <SessionHealthCard data={metrics} />
            </div>
            {/* Audio Section */}
            <div className="secondary-metrics-group">
              <h4 className="secondary-group-title">Audio</h4>
              <AudioSegmentsCard data={metrics} />
            </div>
          </div>
        )}
        {/* FUTURE METRICS - Separate fold */}
        {isExpanded && (
          <div className="metrics-section future-section">
            <div className="future-metrics-header">
              <h3 className="metrics-section-title">Roadmap</h3>
              <button 
                className="future-toggle-btn"
                onClick={() => setFutureMetricsExpanded(!futureMetricsExpanded)}
              >
                {futureMetricsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>{futureMetricsExpanded ? 'Hide' : 'Show'} Coming Soon</span>
              </button>
            </div>
            {futureMetricsExpanded && (
              <div className="metrics-grid">
                <MetricCard title="Comparison Metrics" className="future-card">
                  <div className="future-placeholder">
                    <BarChart3 size={32} />
                    <p>Compare time ranges, slides, or sessions</p>
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                </MetricCard>
                <MetricCard title="Individual Attention Consistency" className="future-card">
                  <div className="future-placeholder">
                    <Activity size={32} />
                    <p>Focus consistency and span analysis</p>
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                </MetricCard>
                <MetricCard title="Questionnaire Insights" className="future-card">
                  <div className="future-placeholder">
                    <TrendingUp size={32} />
                    <p>Pre/post survey analysis and learning improvement</p>
                    <span className="coming-soon">Coming Soon</span>
                  </div>
                </MetricCard>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Metrics;


import { useState } from 'react';

import { ChevronDown, ChevronUp, Eye, Monitor, User, AlertCircle, CheckCircle, XCircle, BarChart3, Clock, TrendingUp, TrendingDown, Activity, Mic, MicOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AttentionPlayer from './AttentionPlayer';
import Heatmap from './Heatmap';

// Utility functions for fractions
const calculatePercentage = (value) => {
  if (typeof value === 'number') return value; // Already a percentage
  if (value && typeof value === 'object' && 'numerator' in value && 'denominator' in value) {
    if (value.denominator === 0) return 0;
    return (value.numerator / value.denominator) * 100;
  }
  return 0;
};

const formatFraction = (value) => {
  if (typeof value === 'number') {
    return `${value}%`;
  }
  if (value && typeof value === 'object' && 'numerator' in value && 'denominator' in value) {
    if (value.denominator === 0) return 'N/A';
    const percentage = calculatePercentage(value);
    return `${value.numerator}/${value.denominator} (${Math.round(percentage)}%)`;
  }
  return 'N/A';
};

// Blue (#3b82f6) = High/Good (≥75%), Orange (#f97316) = Medium/Warning (50-74%), Purple (#8b5cf6) = Low/Bad (<50%)
const getFocusColor = (value) => {
  const percentage = typeof value === 'number' ? value : calculatePercentage(value);
  if (percentage >= 75) return '#3b82f6'; // blue (high/good)
  if (percentage >= 50) return '#f97316'; // orange (medium/warning)
  return '#8b5cf6'; // purple (low/bad)
};

const getFocusLabel = (percentage) => {
  if (percentage >= 75) return 'High';
  if (percentage >= 50) return 'Medium';
  return 'Low';
};

const getObjectColor = (index) => {
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f97316', // orange
    '#06b6d4', // cyan
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f59e0b', // amber
    '#a855f7', // violet
    '#ef4444', // red (kept for non-status uses, but avoid for status indicators)
  ];
  return colors[index % colors.length];
};

// Mock data
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
    avgActiveDevices: { numerator: 27, denominator: 30 }, // 27/30 = 90%
    maxDropout: { numerator: 4, denominator: 30 } // 4/30 = 13%
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
  
  // Transform data for Recharts: convert array of numbers to array of objects with slide and focus
  const chartData = sparklineData.map((value, index) => ({
    slide: index + 1,
    focus: value
  }));
  
  // Custom bar shape to use colorblind-friendly colors
  const CustomBar = (props) => {
    const { payload, x, y, width, height } = props;
    const color = getFocusColor(payload.focus);
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        rx={2}
        ry={2}
      />
    );
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">Slide {data.slide}</p>
          <p className="tooltip-value" style={{ color: getFocusColor(data.focus) }}>
            Focus: {data.focus}%
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <MetricCard title="Focus Over Time" className="full-width">
      <div className="metrics-subgrid">
        <div>
          <h4 className="sub-metric-title">Time Metrics</h4>
          <MetricRow label="Average Focus" value={`${data.focusOverTime.average}%`} />
          <MetricRow label="High Focus (>75%)" value={`${data.focusOverTime.highFocusDuration} min`} />
          <MetricRow label="Low Focus (<40%)" value={`${data.focusOverTime.lowFocusDuration} min`} />
        </div>
        <div>
          <h4 className="sub-metric-title">Focus Distribution</h4>
          <MetricRow label="High" value={`${data.focusOverTime.distribution.high}%`} color="#3b82f6" />
          <MetricRow label="Medium" value={`${data.focusOverTime.distribution.medium}%`} color="#f97316" />
          <MetricRow label="Low" value={`${data.focusOverTime.distribution.low}%`} color="#8b5cf6" />
        </div>
      </div>
      {chartData.length > 0 && (
        <div className="focus-chart-container">
          <h4 className="chart-title">Focus by Slide</h4>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="slide"
                label={{ value: 'Slides', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' } }}
                tick={{ fill: '#64748b', fontSize: '0.7rem' }}
                stroke="#e2e8f0"
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Focus (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' } }}
                tick={{ fill: '#64748b', fontSize: '0.7rem' }}
                stroke="#e2e8f0"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="focus" shape={<CustomBar />} />
            </BarChart>
          </ResponsiveContainer>
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
        <MetricRow label="Avg Attention" value={`${data.slidePerformance.currentSlide.avgAttention}%`} icon={Eye} />
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
          color="#3b82f6"
        />
        <MetricRow 
          label="Worst Slide" 
          value={`Slide ${data.slidePerformance.worstSlide.number} — ${data.slidePerformance.worstSlide.score.toFixed(2)}`}
          icon={TrendingDown}
          color="#8b5cf6"
        />
      </div>
    </div>
  </MetricCard>
);


const SessionHealthCard = ({ data }) => (
  <MetricCard title="Session Health / Data Quality" className="full-width">
    <div className="metrics-subgrid">
      <MetricRow label="Valid Data" value={`${data.sessionHealth.validDataPercent}%`} icon={Activity} />
      <MetricRow label="Avg Active Devices" value={formatFraction(data.sessionHealth.avgActiveDevices)} icon={Monitor} />
      <MetricRow label="Max Dropout" value={formatFraction(data.sessionHealth.maxDropout)} icon={AlertCircle} />
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
        icon={BarChart3}
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
      <Heatmap />
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
              <div className="attention-player-in-metrics">
                <AttentionPlayer 
                  objectAttention={metrics.objectAttention}
                  slideNumber={metrics.learningScore?.slideNumber}
                />
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


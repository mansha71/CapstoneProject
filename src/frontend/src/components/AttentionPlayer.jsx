import { Eye } from 'lucide-react';

// Utility function to get color for attention percentage
const getAttentionColor = (percentage) => {
  if (percentage >= 75) return '#10b981'; // green
  if (percentage >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

// Utility function to get color with opacity for overlay
const getAttentionColorWithOpacity = (percentage) => {
  const baseColor = getAttentionColor(percentage);
  // Convert hex to rgba with 0.3 opacity
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.3)`;
};

// Default dummy data structure - easy to replace with real data
const defaultScreenData = {
  // Screen dimensions (can be actual screen dimensions from backend)
  width: 1920,
  height: 1080,
  // Current slide/screen image URL (can be replaced with actual image)
  imageUrl: null, // null means use placeholder
  // Objects with their positions and attention data
  objects: [
    {
      id: 'graph-1',
      name: 'Graph',
      attention: 45,
      // Position as percentage of screen (0-100)
      position: {
        x: 25, // 25% from left
        y: 20, // 20% from top
        width: 50, // 50% width
        height: 40 // 40% height
      }
    },
    {
      id: 'text-1',
      name: 'Text block',
      attention: 30,
      position: {
        x: 10,
        y: 65,
        width: 80,
        height: 25
      }
    },
    {
      id: 'image-1',
      name: 'Image',
      attention: 25,
      position: {
        x: 60,
        y: 5,
        width: 35,
        height: 30
      }
    }
  ]
};

const AttentionPlayer = ({ screenData = null }) => {
  // Use provided data or fall back to default dummy data
  const data = screenData || defaultScreenData;
  const aspectRatio = data.width / data.height;

  return (
    <div className="attention-player-container">
      <div className="attention-player-header">
        <h3 className="attention-player-title">
          <Eye size={20} style={{ marginRight: '0.5rem' }} />
          Per-Object Attention Visualization
        </h3>
        <div className="attention-player-subtitle">
          Attention percentages overlaid on shared screen
        </div>
      </div>
      
      <div className="attention-player-wrapper">
        <div 
          className="attention-player-screen"
          style={{ 
            aspectRatio: aspectRatio,
            maxWidth: '100%',
            position: 'relative'
          }}
        >
          {/* Background screen/slide */}
          <div className="screen-background">
            {data.imageUrl ? (
              <img 
                src={data.imageUrl} 
                alt="Shared screen" 
                className="screen-image"
              />
            ) : (
              <div className="screen-placeholder">
                <div className="placeholder-content">
                  <Eye size={48} />
                  <p>Shared Screen</p>
                  <span className="placeholder-note">Slide {data.slideNumber || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Overlay attention regions */}
          <div className="attention-overlay">
            {data.objects.map((obj) => {
              const overlayColor = getAttentionColorWithOpacity(obj.attention);
              const borderColor = getAttentionColor(obj.attention);
              
              return (
                <div
                  key={obj.id}
                  className="attention-region"
                  style={{
                    position: 'absolute',
                    left: `${obj.position.x}%`,
                    top: `${obj.position.y}%`,
                    width: `${obj.position.width}%`,
                    height: `${obj.position.height}%`,
                    backgroundColor: overlayColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={`${obj.name}: ${obj.attention}% attention`}
                >
                  <div 
                    className="attention-badge"
                    style={{
                      backgroundColor: borderColor,
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {obj.attention}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="attention-legend">
          <div className="legend-title">Attention Levels</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
              <span>High (≥75%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f59e0b' }} />
              <span>Medium (50-74%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
              <span>Low (&lt;50%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Object list */}
      <div className="attention-objects-list">
        <div className="objects-list-title">Objects on Screen</div>
        <div className="objects-list-items">
          {data.objects.map((obj) => (
            <div key={obj.id} className="object-list-item">
              <div 
                className="object-indicator"
                style={{ backgroundColor: getAttentionColor(obj.attention) }}
              />
              <span className="object-name">{obj.name}</span>
              <span className="object-percentage">{obj.attention}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttentionPlayer;


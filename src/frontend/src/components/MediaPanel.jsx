import { useMemo, useState } from 'react';
import { Flame, MonitorPlay, Layers, AlertCircle } from 'lucide-react';

import Heatmap from './Heatmap';
import { exampleSessionDetail } from '../types/analytics';
import centralCamVideo from '../assets/output2.mp4';
import slideDeckVideo from '../assets/screen.mov';

const VIEW_TABS = [
  {
    id: 'heatmap',
    label: 'Heatmap Overlay',
    description: 'Aggregated gaze replay with overlay',
    icon: Flame,
  },
  {
    id: 'central',
    label: 'Central Cam',
    description: 'Instructor-facing capture feed',
    icon: MonitorPlay,
  },
  {
    id: 'slides',
    label: 'Slides',
    description: 'Live slide deck reference',
    icon: Layers,
  },
];

const exampleSlidesMeta = exampleSessionDetail.payload.slides ?? [];
const exampleFocusSeries =
  exampleSessionDetail.payload.attention?.focusOverTime ?? [];

const DEFAULT_SLIDES = (
  exampleFocusSeries.length
    ? exampleFocusSeries.map((point, idx) => {
        const slideMeta =
          exampleSlidesMeta[idx] ??
          exampleSlidesMeta.find((meta) => meta.slide === idx + 1);
        const slideNumber = slideMeta?.slide ?? idx + 1;
        return {
          id: slideNumber,
          title: `Slide ${slideNumber}`,
          focusValue: point.value ?? 0,
          dwellMs: slideMeta?.dwellMs ?? null,
          highlight: slideMeta?.best
            ? 'best'
            : slideMeta?.worst
              ? 'worst'
              : undefined,
          timestamp: point.ts,
          thumbnailUrl: `/media/${slideNumber}.png`,
        };
      })
    : exampleSlidesMeta.map((slide) => ({
        id: slide.slide,
        title: `Slide ${slide.slide}`,
        focusValue: slide.attentionPercent ?? 0,
        dwellMs: slide.dwellMs ?? null,
        highlight: slide.best ? 'best' : slide.worst ? 'worst' : undefined,
        timestamp: `Slide ${slide.slide}`,
        thumbnailUrl: `/media/${slide.slide}.png`,
      }))
) ?? [];

const formatDwell = (ms = 0) => {
  if (!ms || ms <= 0) return '—';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const MediaPanelSection = ({ title, children }) => (
  <div className="heatmap-container">
    <div className="metrics-header">
      <h2 className="metrics-title">{title}</h2>
    </div>
    {children}
  </div>
);

const CentralCamPanel = () => (
  <MediaPanelSection title="Central Cam">
    <div className="heatmap-player-wrapper">
      <div className="video-player">
        <video
          src={centralCamVideo}
          className="heatmap-video"
          controls
          preload="metadata"
        />
      </div>
    </div>
  </MediaPanelSection>
);

const SlidesPanel = ({
  slides,
  selectedSlideId,
  onSelectSlide,
}) => (
  <MediaPanelSection title="Slides">
    <div className="slides-panel">
      <div className="slide-video-wrapper">
        <video
          className="media-panel-video"
          controls
          src={slideDeckVideo}
          preload="metadata"
        />
        <div className="slide-video-meta">
          {selectedSlideId ? (
            <p>
              Selected Slide {selectedSlideId} • rewinding to timestamp when data
              pipeline is ready.
            </p>
          ) : (
            <p>Select a slide card to jump to its start time (coming soon).</p>
          )}
        </div>
      </div>
      <div className="slides-grid">
        {slides.map((slide) => (
          <button
            key={slide.id}
            type="button"
            className={`slide-card ${slide.highlight ?? ''} ${
              selectedSlideId === slide.id ? 'active' : ''
            }`}
            onClick={() => onSelectSlide(slide)}
          >
            <div className="slide-thumb">
              {slide.thumbnailUrl ? (
                <img
                  src={slide.thumbnailUrl}
                  alt={slide.title}
                  className="slide-thumb-image"
                />
              ) : (
                <>
                  <span className="slide-number">Slide {slide.id}</span>
                  <div className="slide-thumb-gradient" />
                </>
              )}
            </div>
            <div className="slide-meta">
              <p className="slide-title">{slide.title}</p>
              <div className="slide-stats">
                <span className="slide-attention">
                  Focus {Math.round(slide.focusValue ?? 0)}%
                </span>
                <span className="slide-dwell">{formatDwell(slide.dwellMs)}</span>
              </div>
            </div>
            {slide.highlight && (
              <span className={`slide-tag ${slide.highlight}`}>
                {slide.highlight === 'best' ? 'Top engagement' : 'Needs review'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  </MediaPanelSection>
);

const MediaPanel = ({
  heatmapVideoUrl = null,
  centralCamUrl = null,
  slideDeckUrl = null,
  slides = DEFAULT_SLIDES,
}) => {
  const [activeView, setActiveView] = useState('heatmap');
  const [selectedSlide, setSelectedSlide] = useState(null);

  const handleSlideSelect = (slide) => {
    setSelectedSlide(slide);
  };

  const activeContent = useMemo(() => {
    switch (activeView) {
      case 'heatmap':
        return <Heatmap videoUrl={heatmapVideoUrl} />;
      case 'central':
        return <CentralCamPanel />;
      case 'slides':
        return slides.length ? (
          <SlidesPanel
            slides={slides}
            selectedSlideId={selectedSlide?.id ?? null}
            onSelectSlide={handleSlideSelect}
          />
        ) : (
          <div className="media-panel-empty">
            <Layers size={48} />
            <p>No slides detected</p>
            <span>Import a slide deck or sync from the slideRecord folder.</span>
          </div>
        );
      default:
        return (
          <div className="media-panel-empty">
            <AlertCircle size={48} />
            <p>Unable to render view</p>
            <span>Try selecting a different toggle.</span>
          </div>
        );
    }
  }, [activeView, centralCamUrl, heatmapVideoUrl, slides, selectedSlide]);

  return (
    <section className="media-switcher">
      <div className="metrics-header">
        <h2 className="metrics-title">Session Media</h2>
      </div>

      <div className="media-toggle-row">
        {VIEW_TABS.map(({ id, label, description, icon: Icon }) => {
          const isActive = activeView === id;

          return (
            <button
              key={id}
              type="button"
              className={`media-toggle ${isActive ? 'active' : ''}`}
              onClick={() => setActiveView(id)}
            >
              <span className="media-toggle-icon">
                <Icon size={20} />
              </span>
              <span className="media-toggle-meta">
                <span className="media-toggle-label">{label}</span>
                <span className="media-toggle-description">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="media-view-container">{activeContent}</div>
    </section>
  );
};

export default MediaPanel;


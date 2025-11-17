import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const Heatmap = ({ videoUrl = null }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Update current time as video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSliderChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="heatmap-container">
      <div className="metrics-header">
        <h2 className="metrics-title">Heatmap</h2>
      </div>
      
      <div className="heatmap-player-wrapper">
        <div className="video-player">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="heatmap-video"
              preload="metadata"
            />
          ) : (
            <div className="video-placeholder">
              <div className="placeholder-content">
                <Play size={48} />
                <p>No video available</p>
                <span className="placeholder-note">Upload a video to view heatmap</span>
              </div>
            </div>
          )}
        </div>

        <div className="heatmap-controls">
          <button
            className="play-pause-btn"
            onClick={togglePlayPause}
            disabled={!videoUrl || isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <div className="slider-container">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSliderChange}
              step="0.1"
              className="heatmap-slider"
              disabled={!videoUrl || isLoading}
            />
          </div>

          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Heatmap;


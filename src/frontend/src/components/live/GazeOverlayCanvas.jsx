import { useEffect, useRef } from 'react';

const GazeOverlayCanvas = ({ points, showGazePoints, showHeatmap }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const parent = canvas.parentElement;
    if (!parent) return undefined;

    const updateCanvasSize = () => {
      const nextWidth = parent.clientWidth;
      const nextHeight = parent.clientHeight;
      if (!nextWidth || !nextHeight) return;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    };

    updateCanvasSize();
    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!points.length || (!showGazePoints && !showHeatmap)) return;

    const recentPoints = points.slice(-200);
    if (showHeatmap) {
      recentPoints.forEach((point, index) => {
        const px = point.x * canvas.width;
        const py = point.y * canvas.height;
        const intensity = Math.max(0.12, (index + 1) / recentPoints.length * 0.25);
        const radius = Math.max(28, Math.min(canvas.width, canvas.height) * 0.06);

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, `rgba(239, 68, 68, ${intensity})`);
        gradient.addColorStop(0.5, `rgba(245, 158, 11, ${intensity * 0.65})`);
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (showGazePoints) {
      recentPoints.forEach((point, index) => {
        const px = point.x * canvas.width;
        const py = point.y * canvas.height;
        const alpha = Math.max(0.2, (index + 1) / recentPoints.length);
        const radius = Math.max(2, 6 * alpha);

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.fill();
      });
    }
  }, [points, showGazePoints, showHeatmap]);

  return <canvas ref={canvasRef} className="live-gaze-overlay-canvas" aria-hidden="true" />;
};

export default GazeOverlayCanvas;

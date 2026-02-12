import { useMemo } from 'react';

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const toPercentBox = (bbox, coordinateSystem, video) => {
  if (!bbox) return null;
  if (coordinateSystem === 'normalized') {
    return {
      left: clampPercent(bbox.x * 100),
      top: clampPercent(bbox.y * 100),
      width: clampPercent(bbox.w * 100),
      height: clampPercent(bbox.h * 100),
    };
  }

  const width = video?.width || 1;
  const height = video?.height || 1;
  return {
    left: clampPercent((bbox.x / width) * 100),
    top: clampPercent((bbox.y / height) * 100),
    width: clampPercent((bbox.w / width) * 100),
    height: clampPercent((bbox.h / height) * 100),
  };
};

const toPercentPoint = (point, coordinateSystem, video) => {
  if (coordinateSystem === 'normalized') {
    return { left: clampPercent(point.cx * 100), top: clampPercent(point.cy * 100) };
  }
  const width = video?.width || 1;
  const height = video?.height || 1;
  return {
    left: clampPercent((point.cx / width) * 100),
    top: clampPercent((point.cy / height) * 100),
  };
};

const trailPointColor = (index, total) => {
  if (total <= 1) return 'hsla(217, 91%, 60%, 0.95)';
  const ratio = index / (total - 1); // 0 oldest -> 1 newest
  const lightness = 78 - (ratio * 24); // lighter old points, darker new points
  const alpha = 0.28 + (ratio * 0.67); // fade old points, emphasize new points
  return `hsla(217, 91%, ${lightness.toFixed(1)}%, ${alpha.toFixed(3)})`;
};

const nearestFrame = (frameDetections, currentTimeMs) => {
  if (!frameDetections?.length) return null;
  return frameDetections.reduce((closest, frame) => {
    if (!closest) return frame;
    const currDelta = Math.abs(frame.tMs - currentTimeMs);
    const bestDelta = Math.abs(closest.tMs - currentTimeMs);
    return currDelta < bestDelta ? frame : closest;
  }, null);
};

const InstructorOverlayCanvas = ({
  tracking,
  currentTimeSec,
  showBBox = true,
  showTrail = true,
  showCoordinateLabels = false,
}) => {
  const currentTimeMs = Math.round(currentTimeSec * 1000);
  
  const activeFrame = useMemo(
    () => nearestFrame(tracking?.frameDetections, currentTimeMs),
    [tracking?.frameDetections, currentTimeMs]
  );

  const trailPoints = useMemo(() => {
    if (!tracking?.trackPoints?.length) return [];
    return tracking.trackPoints
      .filter((point) => point.tMs <= currentTimeMs)
      .slice(-100)
      .map((point) => ({
        point,
        ...toPercentPoint(point, tracking.coordinateSystem, tracking.video),
      }));
  }, [tracking, currentTimeMs]);

  const activeBox = activeFrame?.bbox
    ? toPercentBox(activeFrame.bbox, tracking.coordinateSystem, tracking.video)
    : null;
  const cornerLabels = (() => {
    if (!activeFrame?.bbox) return null;
    const box = activeFrame.bbox;
    const x1 = box.x;
    const y1 = box.y;
    const x2 = box.x + box.w;
    const y2 = box.y + box.h;
    const format = (value) =>
      tracking?.coordinateSystem === 'pixels' ? `${Math.round(value)}` : value.toFixed(3);
    const minInset = 1.2;
    const verticalOffset = 0.8;
    const horizontalOffset = 0.8;
    const left = activeBox?.left ?? 50;
    const top = activeBox?.top ?? 50;
    const right = left + (activeBox?.width ?? 0);
    const bottom = top + (activeBox?.height ?? 0);
    return [
      {
        key: "tl",
        text: `TL(${format(x1)}, ${format(y1)})`,
        left: Math.max(0.8, Math.min(99.2, left - horizontalOffset)),
        top: Math.max(0.8, Math.min(99.2, top - verticalOffset)),
      },
      {
        key: "tr",
        text: `TR(${format(x2)}, ${format(y1)})`,
        left: Math.max(0.8, Math.min(99.2, right + horizontalOffset)),
        top: Math.max(0.8, Math.min(99.2, top - verticalOffset)),
      },
      {
        key: "bl",
        text: `BL(${format(x1)}, ${format(y2)})`,
        left: Math.max(0.8, Math.min(99.2, left - horizontalOffset)),
        top: Math.max(0.8, Math.min(99.2, bottom + verticalOffset)),
      },
      {
        key: "br",
        text: `BR(${format(x2)}, ${format(y2)})`,
        left: Math.max(0.8, Math.min(99.2, right + horizontalOffset)),
        top: Math.max(0.8, Math.min(99.2, bottom + verticalOffset)),
      },
    ];
  })();

  return (
    <div className="instructor-overlay-layer">
      {showTrail
        ? trailPoints.map((pointEntry, index) => (
            <span
              key={`${pointEntry.left}-${pointEntry.top}-${index}`}
              className="overlay-trail-point"
              style={{
                left: `${pointEntry.left}%`,
                top: `${pointEntry.top}%`,
                backgroundColor: trailPointColor(index, trailPoints.length),
              }}
            />
          ))
        : null}

      {showBBox && activeBox ? (
        <span
          className="overlay-bbox"
          style={{
            left: `${activeBox.left}%`,
            top: `${activeBox.top}%`,
            width: `${activeBox.width}%`,
            height: `${activeBox.height}%`,
          }}
        />
      ) : null}

      {showCoordinateLabels && cornerLabels
        ? cornerLabels.map((corner) => (
            <span
              key={corner.key}
              className={`overlay-corner-label ${corner.key}`}
              style={{
                left: `${corner.left}%`,
                top: `${corner.top}%`,
              }}
            >
              {corner.text}
            </span>
          ))
        : null}
    </div>
  );
};

export default InstructorOverlayCanvas;

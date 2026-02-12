export type TrackingCoordinateSystem = 'normalized' | 'pixels';

export interface VideoMetadata {
  width: number;
  height: number;
  fps: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameDetection {
  tMs: number;
  bbox: BBox | null;
  conf?: number | null;
}

export interface TrackPoint {
  tMs: number;
  trackId: number;
  cx: number;
  cy: number;
  quality: string;
}

export interface DerivedMetrics {
  coverage: number;
  gapCount: number;
  longestGapMs: number;
  distance: number;
  jitter?: number;
}

export interface ProcessingMeta {
  detector: string;
  detectorRuntime?: string;
  detectorVersion?: string;
  modelSource?: string;
  tracker: string;
  trackerParams?: Record<string, unknown>;
  cleaning?: Record<string, unknown>;
}

export interface InstructorTrackingResult {
  coordinateSystem: TrackingCoordinateSystem;
  video: VideoMetadata;
  processingMeta: ProcessingMeta;
  frameDetections: FrameDetection[];
  trackPoints: TrackPoint[];
  derivedMetrics: DerivedMetrics;
}

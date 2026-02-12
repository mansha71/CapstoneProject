from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Optional


TrackQuality = Literal["measured", "lost", "interpolated"]
CoordinateSystem = Literal["normalized", "pixels"]


@dataclass(slots=True)
class BBox:
  x: float
  y: float
  w: float
  h: float

  def area(self) -> float:
    return max(0.0, self.w) * max(0.0, self.h)

  def centroid(self) -> tuple[float, float]:
    return (self.x + (self.w / 2.0), self.y + (self.h / 2.0))

  def to_xyxy(self) -> tuple[float, float, float, float]:
    return (self.x, self.y, self.x + self.w, self.y + self.h)

  def iou(self, other: "BBox") -> float:
    ax1, ay1, ax2, ay2 = self.to_xyxy()
    bx1, by1, bx2, by2 = other.to_xyxy()
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    iw = max(0.0, inter_x2 - inter_x1)
    ih = max(0.0, inter_y2 - inter_y1)
    inter_area = iw * ih
    if inter_area <= 0.0:
      return 0.0
    union = self.area() + other.area() - inter_area
    if union <= 0.0:
      return 0.0
    return inter_area / union


@dataclass(slots=True)
class Detection:
  bbox: BBox
  conf: float
  cls: int


@dataclass(slots=True)
class FrameDetection:
  t_ms: int
  bbox: Optional[BBox]
  conf: Optional[float]

  def to_payload(self) -> dict[str, Any]:
    return {
      "tMs": self.t_ms,
      "bbox": None
      if self.bbox is None
      else {
        "x": self.bbox.x,
        "y": self.bbox.y,
        "w": self.bbox.w,
        "h": self.bbox.h,
      },
      "conf": self.conf,
    }


@dataclass(slots=True)
class TrackPoint:
  t_ms: int
  track_id: int
  cx: float
  cy: float
  quality: TrackQuality

  def to_payload(self) -> dict[str, Any]:
    return {
      "tMs": self.t_ms,
      "trackId": self.track_id,
      "cx": self.cx,
      "cy": self.cy,
      "quality": self.quality,
    }


@dataclass(slots=True)
class VideoMeta:
  width: int
  height: int
  fps: float
  frame_count: int


@dataclass(slots=True)
class ProcessingConfig:
  coordinate_system: CoordinateSystem = "normalized"
  process_fps: float = 10.0
  min_conf: float = 0.4
  min_area_ratio: float = 0.005
  max_area_ratio: float = 0.60
  min_aspect_ratio: Optional[float] = 0.15
  max_aspect_ratio: Optional[float] = 4.0
  iou_weight: float = 0.7
  conf_weight: float = 0.3
  low_iou_reject_threshold: float = 0.05
  low_iou_reject_patience: int = 6
  max_gap_frames: int = 5
  interpolate_gaps: bool = True
  detector_type: str = "yolov8n"
  detector_model: str = "yolov8n.pt"
  detector_device: str = "cpu"
  detector_imgsz: int = 640
  tracker_type: str = "single-target-iou"
  processing_timeout_seconds: int = 1800


@dataclass(slots=True)
class ProcessingMeta:
  detector: str
  detector_runtime: str
  detector_version: Optional[str]
  model_source: str
  tracker: str
  tracker_params: dict[str, Any]
  cleaning: dict[str, Any]

  def to_payload(self) -> dict[str, Any]:
    return {
      "detector": self.detector,
      "detectorRuntime": self.detector_runtime,
      "detectorVersion": self.detector_version,
      "modelSource": self.model_source,
      "tracker": self.tracker,
      "trackerParams": self.tracker_params,
      "cleaning": self.cleaning,
    }


from __future__ import annotations

from typing import Protocol

from ..schemas import BBox, FrameDetection, ProcessingConfig, TrackPoint
from .iou_single import SingleTargetIouTracker, interpolate_short_gaps


class Tracker(Protocol):
  prev_bbox: BBox | None
  lost_count: int

  def update(
    self,
    t_ms: int,
    bbox: BBox | None,
    conf: float | None,
  ) -> tuple[FrameDetection, TrackPoint]:
    ...


def create_tracker(config: ProcessingConfig) -> Tracker:
  tracker_name = canonical_tracker_name(config.tracker_type)
  if tracker_name == "single-target-iou":
    return SingleTargetIouTracker(track_id=1)
  supported = "single-target-iou"
  raise ValueError(
    f"Unsupported tracker_type '{config.tracker_type}'. "
    f"Supported tracker types: {supported}."
  )


def canonical_tracker_name(name: str) -> str:
  key = (name or "").strip().lower()
  aliases = {
    "single-target-iou": "single-target-iou",
    "single_target_iou": "single-target-iou",
    "iou-single": "single-target-iou",
  }
  return aliases.get(key, key)


__all__ = [
  "SingleTargetIouTracker",
  "Tracker",
  "canonical_tracker_name",
  "create_tracker",
  "interpolate_short_gaps",
]


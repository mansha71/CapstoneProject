from __future__ import annotations

from dataclasses import replace
from typing import Optional

from ..schemas import BBox, FrameDetection, TrackPoint


class SingleTargetIouTracker:
  def __init__(self, track_id: int = 1) -> None:
    self.track_id = track_id
    self.prev_bbox: Optional[BBox] = None
    self.lost_count = 0

  def update(
    self,
    t_ms: int,
    bbox: Optional[BBox],
    conf: Optional[float],
  ) -> tuple[FrameDetection, TrackPoint]:
    if bbox is not None:
      self.prev_bbox = bbox
      self.lost_count = 0
      cx, cy = bbox.centroid()
      frame_det = FrameDetection(t_ms=t_ms, bbox=bbox, conf=conf)
      point = TrackPoint(t_ms=t_ms, track_id=self.track_id, cx=cx, cy=cy, quality="measured")
      return frame_det, point

    self.lost_count += 1
    if self.prev_bbox is not None:
      cx, cy = self.prev_bbox.centroid()
    else:
      cx, cy = 0.5, 0.5
    frame_det = FrameDetection(t_ms=t_ms, bbox=None, conf=None)
    point = TrackPoint(t_ms=t_ms, track_id=self.track_id, cx=cx, cy=cy, quality="lost")
    return frame_det, point


def interpolate_short_gaps(
  points: list[TrackPoint],
  max_gap_frames: int,
) -> list[TrackPoint]:
  if max_gap_frames <= 0 or len(points) < 3:
    return points

  result = [replace(point) for point in points]
  idx = 0
  while idx < len(result):
    if result[idx].quality != "lost":
      idx += 1
      continue

    start = idx - 1
    end = idx
    while end < len(result) and result[end].quality == "lost":
      end += 1

    gap_len = end - idx
    if (
      start >= 0
      and end < len(result)
      and result[start].quality == "measured"
      and result[end].quality == "measured"
      and gap_len <= max_gap_frames
    ):
      start_point = result[start]
      end_point = result[end]
      span = float(end - start)
      for offset, point_index in enumerate(range(start + 1, end), start=1):
        alpha = offset / span
        interp_x = start_point.cx + ((end_point.cx - start_point.cx) * alpha)
        interp_y = start_point.cy + ((end_point.cy - start_point.cy) * alpha)
        result[point_index] = TrackPoint(
          t_ms=result[point_index].t_ms,
          track_id=result[point_index].track_id,
          cx=interp_x,
          cy=interp_y,
          quality="interpolated",
        )
    idx = end

  return result


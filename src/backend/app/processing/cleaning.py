from __future__ import annotations

from typing import Optional

from .schemas import BBox, Detection, ProcessingConfig


def _passes_size_and_shape(bbox: BBox, config: ProcessingConfig) -> bool:
  area = bbox.area()
  if area < config.min_area_ratio or area > config.max_area_ratio:
    return False
  if bbox.h <= 0.0:
    return False
  aspect_ratio = bbox.w / bbox.h
  if config.min_aspect_ratio is not None and aspect_ratio < config.min_aspect_ratio:
    return False
  if config.max_aspect_ratio is not None and aspect_ratio > config.max_aspect_ratio:
    return False
  return True


def select_instructor_detection(
  detections: list[Detection],
  prev_bbox: Optional[BBox],
  lost_count: int,
  config: ProcessingConfig,
) -> Optional[Detection]:
  candidates = [
    det
    for det in detections
    if det.cls == 0 and det.conf >= config.min_conf and _passes_size_and_shape(det.bbox, config)
  ]
  if not candidates:
    return None

  if prev_bbox is None:
    return max(candidates, key=lambda d: d.conf)

  best_iou = -1.0
  best_score = -1.0
  best_candidate: Optional[Detection] = None
  for candidate in candidates:
    iou = candidate.bbox.iou(prev_bbox)
    score = (config.iou_weight * iou) + (config.conf_weight * candidate.conf)
    if score > best_score:
      best_score = score
      best_iou = iou
      best_candidate = candidate

  if (
    best_candidate is not None
    and best_iou < config.low_iou_reject_threshold
    and lost_count < config.low_iou_reject_patience
  ):
    # Avoid jumping to another person during short occlusion periods.
    return None
  return best_candidate


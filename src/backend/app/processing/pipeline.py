from __future__ import annotations

import json
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Optional

import cv2

from .cleaning import select_instructor_detection
from .detectors import canonical_detector_name, create_detector
from .metrics import compute_derived_metrics
from .schemas import ProcessingConfig, ProcessingMeta, VideoMeta
from .tracking import canonical_tracker_name, create_tracker, interpolate_short_gaps


def _frame_stride(source_fps: float, process_fps: float) -> int:
  if source_fps <= 0.0 or process_fps <= 0.0:
    return 1
  if process_fps >= source_fps:
    return 1
  return max(1, int(round(source_fps / process_fps)))


def _to_pixels_payload(payload: dict[str, Any]) -> dict[str, Any]:
  video = payload.get("video") or {}
  width = float(video.get("width") or 1)
  height = float(video.get("height") or 1)
  if width <= 0.0 or height <= 0.0:
    return payload

  for frame in payload.get("frameDetections", []):
    bbox = frame.get("bbox")
    if bbox is None:
      continue
    frame["bbox"] = {
      "x": float(bbox["x"]) * width,
      "y": float(bbox["y"]) * height,
      "w": float(bbox["w"]) * width,
      "h": float(bbox["h"]) * height,
    }
  for point in payload.get("trackPoints", []):
    point["cx"] = float(point["cx"]) * width
    point["cy"] = float(point["cy"]) * height

  payload["coordinateSystem"] = "pixels"
  return payload


def _default_diagnostics() -> dict[str, Any]:
  return {
    "processedFrames": 0,
    "totalFramesRead": 0,
    "lostFrames": 0,
    "interpolatedFrames": 0,
    "config": {},
  }


def run_pipeline(
  video_path: Path,
  video_meta: VideoMeta,
  config: Optional[ProcessingConfig] = None,
  diagnostics_path: Optional[Path] = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
  cfg = config or ProcessingConfig()
  diagnostics = _default_diagnostics()
  diagnostics["config"] = asdict(cfg)

  detector = create_detector(cfg)
  tracker = create_tracker(cfg)

  cap = cv2.VideoCapture(str(video_path))
  if not cap.isOpened():
    raise RuntimeError(f"Unable to open video: {video_path}")

  source_fps = video_meta.fps if video_meta.fps > 0 else float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
  stride = _frame_stride(source_fps=source_fps, process_fps=cfg.process_fps)
  start_time = time.monotonic()

  frame_detections = []
  track_points = []
  frame_idx = 0
  payload: dict[str, Any] | None = None
  try:
    while True:
      ok, frame = cap.read()
      if not ok:
        break
      diagnostics["totalFramesRead"] += 1

      if frame_idx % stride != 0:
        frame_idx += 1
        continue

      if (time.monotonic() - start_time) > cfg.processing_timeout_seconds:
        raise TimeoutError(
          f"processing timeout after {cfg.processing_timeout_seconds}s "
          f"(read={diagnostics['totalFramesRead']}, processed={diagnostics['processedFrames']})"
        )

      t_ms = int((frame_idx / max(source_fps, 1.0)) * 1000.0)
      detections = detector.detect_frame(frame)
      selected = select_instructor_detection(
        detections=detections,
        prev_bbox=tracker.prev_bbox,
        lost_count=tracker.lost_count,
        config=cfg,
      )
      selected_bbox = selected.bbox if selected is not None else None
      selected_conf = selected.conf if selected is not None else None
      frame_det, track_point = tracker.update(
        t_ms=t_ms,
        bbox=selected_bbox,
        conf=selected_conf,
      )
      if track_point.quality == "lost":
        diagnostics["lostFrames"] += 1

      frame_detections.append(frame_det)
      track_points.append(track_point)
      diagnostics["processedFrames"] += 1
      frame_idx += 1
    if cfg.interpolate_gaps:
      interpolated_points = interpolate_short_gaps(track_points, max_gap_frames=cfg.max_gap_frames)
      diagnostics["interpolatedFrames"] = sum(
        1 for point in interpolated_points if point.quality == "interpolated"
      )
    else:
      interpolated_points = track_points

    metrics = compute_derived_metrics(interpolated_points)
    detector_name = canonical_detector_name(cfg.detector_type)
    tracker_name = canonical_tracker_name(cfg.tracker_type)
    processing_meta = ProcessingMeta(
      detector=detector_name,
      detector_runtime=cfg.detector_device,
      detector_version=getattr(detector, "detector_version", None),
      model_source=getattr(detector, "model_source", "ultralytics"),
      tracker=tracker_name,
      tracker_params={
        "trackId": getattr(tracker, "track_id", 1),
        "maxGapFrames": cfg.max_gap_frames,
        "interpolateGaps": cfg.interpolate_gaps,
        "processFps": cfg.process_fps,
      },
      cleaning={
        "minConf": cfg.min_conf,
        "minAreaRatio": cfg.min_area_ratio,
        "maxAreaRatio": cfg.max_area_ratio,
        "minAspectRatio": cfg.min_aspect_ratio,
        "maxAspectRatio": cfg.max_aspect_ratio,
        "iouWeight": cfg.iou_weight,
        "confWeight": cfg.conf_weight,
        "lowIouRejectThreshold": cfg.low_iou_reject_threshold,
        "lowIouRejectPatience": cfg.low_iou_reject_patience,
      },
    )

    payload = {
      "coordinateSystem": "normalized",
      "video": {
        "width": video_meta.width,
        "height": video_meta.height,
        "fps": video_meta.fps,
      },
      "processingMeta": processing_meta.to_payload(),
      "frameDetections": [fd.to_payload() for fd in frame_detections],
      "trackPoints": [tp.to_payload() for tp in interpolated_points],
      "derivedMetrics": metrics,
    }

    if cfg.coordinate_system == "pixels":
      payload = _to_pixels_payload(payload)
    elif cfg.coordinate_system != "normalized":
      raise ValueError(f"Unsupported coordinate system: {cfg.coordinate_system}")

  except Exception as exc:
    diagnostics["error"] = str(exc)
    raise
  finally:
    cap.release()
    if diagnostics_path is not None:
      diagnostics_path.parent.mkdir(parents=True, exist_ok=True)
      diagnostics_path.write_text(json.dumps(diagnostics, indent=2), encoding="utf-8")

  if payload is None:
    raise RuntimeError("Pipeline failed to produce payload")
  return payload, diagnostics


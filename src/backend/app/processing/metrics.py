from __future__ import annotations

import math

import numpy as np

from .schemas import TrackPoint


def compute_derived_metrics(points: list[TrackPoint]) -> dict[str, float | int]:
  if not points:
    return {
      "coverage": 0.0,
      "gapCount": 0,
      "longestGapMs": 0,
      "distance": 0.0,
      "jitter": 0.0,
    }

  total = len(points)
  covered = sum(1 for p in points if p.quality in {"measured", "interpolated"})
  coverage = covered / float(total)

  gap_count = 0
  longest_gap_ms = 0
  gap_start_t: int | None = None
  for point in points:
    if point.quality == "lost":
      if gap_start_t is None:
        gap_start_t = point.t_ms
    elif gap_start_t is not None:
      gap_count += 1
      longest_gap_ms = max(longest_gap_ms, max(0, point.t_ms - gap_start_t))
      gap_start_t = None

  if gap_start_t is not None:
    gap_count += 1
    longest_gap_ms = max(longest_gap_ms, max(0, points[-1].t_ms - gap_start_t))

  valid = [p for p in points if p.quality in {"measured", "interpolated"}]
  if len(valid) < 2:
    return {
      "coverage": coverage,
      "gapCount": gap_count,
      "longestGapMs": longest_gap_ms,
      "distance": 0.0,
      "jitter": 0.0,
    }

  step_vectors: list[tuple[float, float]] = []
  step_magnitudes: list[float] = []
  distance = 0.0
  for idx in range(1, len(valid)):
    dx = valid[idx].cx - valid[idx - 1].cx
    dy = valid[idx].cy - valid[idx - 1].cy
    step_vectors.append((dx, dy))
    magnitude = math.sqrt((dx * dx) + (dy * dy))
    step_magnitudes.append(magnitude)
    distance += magnitude

  jitter = float(np.std(np.asarray(step_magnitudes, dtype=float))) if step_magnitudes else 0.0
  return {
    "coverage": coverage,
    "gapCount": gap_count,
    "longestGapMs": int(longest_gap_ms),
    "distance": float(distance),
    "jitter": jitter,
  }


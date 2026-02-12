from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from ..schemas import BBox, Detection
from .base import Detector

try:
  from ultralytics import YOLO
except Exception as exc:  # pragma: no cover
  YOLO = None
  _ULTRALYTICS_IMPORT_ERROR = exc
else:  # pragma: no cover
  _ULTRALYTICS_IMPORT_ERROR = None


def _resolve_model_path(model_name: str) -> str:
  candidate = Path(model_name)
  backend_root = Path(__file__).resolve().parents[3]
  if candidate.is_absolute():
    resolved_candidate = candidate.resolve()
    if resolved_candidate.exists() and resolved_candidate.is_relative_to(backend_root):
      return str(resolved_candidate)
  else:
    local_candidate = (backend_root / candidate).resolve()
    if local_candidate.exists() and local_candidate.is_relative_to(backend_root):
      return str(local_candidate)

  for local_dir in (backend_root / "models", backend_root / "data" / "models"):
    local_model = local_dir / model_name
    if local_model.exists():
      return str(local_model)

  # Allow plain model names (for Ultralytics download/cache behavior), but
  # block path-based lookups that do not resolve inside backend/.
  if candidate.is_absolute() or len(candidate.parts) > 1:
    raise FileNotFoundError(
      "Detector model path must resolve inside backend/. "
      f"Got '{model_name}'."
    )
  return model_name


@lru_cache(maxsize=4)
def _load_model(model_name: str) -> Any:
  if YOLO is None:
    raise RuntimeError("Ultralytics is not available") from _ULTRALYTICS_IMPORT_ERROR
  return YOLO(_resolve_model_path(model_name))


@dataclass(slots=True)
class YoloV8NDetector(Detector):
  model_name: str = "yolov8n.pt"
  device: str = "cpu"
  imgsz: int = 640
  conf: float = 0.25
  iou: float = 0.5

  def __post_init__(self) -> None:
    self._model = _load_model(self.model_name)

  def detect_frame(self, image: np.ndarray) -> list[Detection]:
    height, width = image.shape[:2]
    if height <= 0 or width <= 0:
      return []

    results = self._model.predict(
      image,
      conf=self.conf,
      iou=self.iou,
      classes=[0],  # person
      imgsz=self.imgsz,
      device=self.device,
      verbose=False,
    )

    output: list[Detection] = []
    for result in results:
      boxes = getattr(result, "boxes", None)
      if boxes is None:
        continue
      for box in boxes:
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        x1 = max(0.0, min(x1, float(width)))
        y1 = max(0.0, min(y1, float(height)))
        x2 = max(0.0, min(x2, float(width)))
        y2 = max(0.0, min(y2, float(height)))
        w = max(0.0, x2 - x1)
        h = max(0.0, y2 - y1)
        if w <= 0.0 or h <= 0.0:
          continue
        output.append(
          Detection(
            bbox=BBox(
              x=x1 / float(width),
              y=y1 / float(height),
              w=w / float(width),
              h=h / float(height),
            ),
            conf=float(box.conf[0]),
            cls=int(box.cls[0]),
          )
        )
    return output

  @property
  def detector_version(self) -> str | None:
    try:
      import ultralytics

      return getattr(ultralytics, "__version__", None)
    except Exception:
      return None


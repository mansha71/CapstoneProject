from __future__ import annotations

from typing import Callable

from ..schemas import ProcessingConfig
from .base import Detector
from .yolov8n import YoloV8NDetector


DetectorFactory = Callable[[ProcessingConfig], Detector]


def _create_yolov8n_detector(config: ProcessingConfig) -> Detector:
  return YoloV8NDetector(
    model_name=config.detector_model,
    device=config.detector_device,
    imgsz=config.detector_imgsz,
    conf=config.min_conf,
  )


_DETECTOR_ALIASES: dict[str, str] = {
  "yolov8n": "yolov8n",
  "yolov8": "yolov8n",
}

_DETECTOR_FACTORIES: dict[str, DetectorFactory] = {
  "yolov8n": _create_yolov8n_detector,
}


def canonical_detector_name(name: str) -> str:
  key = (name or "").strip().lower()
  return _DETECTOR_ALIASES.get(key, key)


def create_detector(config: ProcessingConfig) -> Detector:
  detector_name = canonical_detector_name(config.detector_type)
  factory = _DETECTOR_FACTORIES.get(detector_name)
  if factory is None:
    supported = ", ".join(sorted(_DETECTOR_FACTORIES.keys()))
    raise ValueError(
      f"Unsupported detector_type '{config.detector_type}'. "
      f"Supported detector types: {supported}."
    )
  return factory(config)


__all__ = [
  "Detector",
  "YoloV8NDetector",
  "canonical_detector_name",
  "create_detector",
]


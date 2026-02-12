from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from ..schemas import Detection


class Detector(ABC):
  @abstractmethod
  def detect_frame(self, image: np.ndarray) -> list[Detection]:
    """
    Run detector inference on a frame and return detections in normalized xywh.
    """


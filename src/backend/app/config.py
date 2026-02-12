from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
  database_url: str = "sqlite:///./data/backend.db"
  redis_url: str = "redis://localhost:6379/0"
  data_root: Path = Path("data") / "sessions"
  process_fps: float = 10.0
  detector_min_conf: float = 0.4
  detector_model: str = "yolov8n.pt"
  detector_device: str = "cpu"
  detector_imgsz: int = 640
  max_gap_frames: int = 5
  processing_timeout_seconds: int = 1800

  class Config:
    env_prefix = "BACKEND_"


settings = Settings()


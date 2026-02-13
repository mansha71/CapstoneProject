"""
Background worker entrypoint.

Processes session jobs with decode -> detect -> clean -> track -> metrics
and persists instructor-tracking results for the dashboard.
"""

import shutil
import subprocess
import json
from datetime import datetime
from pathlib import Path

import cv2
from redis import Redis
from rq import Queue, Worker

from .config import settings
from .database import SessionLocal
from . import models
from .processing.pipeline import run_pipeline
from .processing.schemas import ProcessingConfig, VideoMeta


def _is_browser_playable_mp4(path: Path) -> bool:
  """
  Return True if video is already browser-friendly enough to skip transcode.
  We treat H.264 in MP4-family containers as playable.
  """
  try:
    codec = subprocess.run(
      [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
      ],
      check=False,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=15,
    ).stdout.strip()

    format_name = subprocess.run(
      [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=format_name",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
      ],
      check=False,
      stdout=subprocess.PIPE,
      stderr=subprocess.DEVNULL,
      text=True,
      timeout=15,
    ).stdout.strip()
  except Exception:  # noqa: BLE001
    return False

  if codec != "h264":
    return False

  formats = {f.strip() for f in format_name.split(",") if f.strip()}
  return bool(formats.intersection({"mp4", "mov", "m4a", "3gp", "3g2", "mj2"}))


def _transcode_to_browser_compatible(path: Path) -> None:
  """
  Transcode video to H.264/AAC MP4 for reliable browser playback.
  Uses stderr to a file (not a pipe) to avoid subprocess deadlock.
  """
  tmp_path = path.with_suffix(".mp4.tmp")
  err_path = path.with_suffix(".mp4.err")
  cmd = [
    "ffmpeg",
    "-y",
    "-nostats",
    "-loglevel",
    "error",
    "-i",
    str(path),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "28",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    str(tmp_path),
  ]
  try:
    with open(err_path, "w") as err_file:
      result = subprocess.run(
        cmd,
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=err_file,
        timeout=3600,
      )
  except FileNotFoundError as e:
    raise RuntimeError(
      "ffmpeg not found. Install with: apt install ffmpeg"
    ) from e
  except subprocess.TimeoutExpired as e:
    tmp_path.unlink(missing_ok=True)
    err_path.unlink(missing_ok=True)
    raise RuntimeError("ffmpeg transcode timed out (1h limit)") from e

  if result.returncode != 0:
    tmp_path.unlink(missing_ok=True)
    err_text = err_path.read_text(errors="replace") if err_path.exists() else ""
    err_path.unlink(missing_ok=True)
    raise RuntimeError(f"ffmpeg failed: {err_text.strip() or result.returncode}")

  err_path.unlink(missing_ok=True)
  shutil.move(str(tmp_path), str(path))


def _decode_video_metadata(path: Path) -> tuple[int, int, float, int]:
  cap = cv2.VideoCapture(str(path))
  if not cap.isOpened():
    raise RuntimeError(f"Unable to open video: {path}")
  width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
  height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
  fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
  frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
  cap.release()
  return width, height, fps, frame_count


def process_job(job_id: str) -> None:
  db = SessionLocal()
  try:
    job = (
      db.query(models.ProcessingJob)
      .filter(models.ProcessingJob.job_id == job_id)
      .join(models.Session)
      .first()
    )
    if not job:
      return

    job.status = "running"
    job.started_at = datetime.utcnow()
    job.progress = 0.1
    db.commit()

    video_path = Path(job.session.video_path)
    if video_path.is_file() and not _is_browser_playable_mp4(video_path):
      _transcode_to_browser_compatible(video_path)
    job.progress = 0.2
    db.commit()

    width, height, fps, frame_count = _decode_video_metadata(video_path)
    job.session.video_width = width
    job.session.video_height = height
    job.session.fps = fps
    job.progress = 0.3
    db.commit()

    session_dir = video_path.parent
    results_dir = session_dir / "results"
    diagnostics_path = results_dir / "processing-diagnostics.json"
    payload_path = results_dir / "instructor-tracking.json"
    cfg = ProcessingConfig(
      coordinate_system="normalized",
      process_fps=settings.process_fps,
      min_conf=settings.detector_min_conf,
      detector_type=getattr(settings, "detector_type", "yolov8n"),
      detector_model=settings.detector_model,
      detector_device=settings.detector_device,
      detector_imgsz=settings.detector_imgsz,
      tracker_type=getattr(settings, "tracker_type", "single-target-iou"),
      max_gap_frames=settings.max_gap_frames,
      processing_timeout_seconds=settings.processing_timeout_seconds,
    )
    payload, diagnostics = run_pipeline(
      video_path=video_path,
      video_meta=VideoMeta(width=width, height=height, fps=fps, frame_count=frame_count),
      config=cfg,
      diagnostics_path=diagnostics_path,
    )
    results_dir.mkdir(parents=True, exist_ok=True)
    payload_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    tracking = (
      db.query(models.InstructorTrackingResult)
      .filter(models.InstructorTrackingResult.session_id == job.session.id)
      .first()
    )
    if tracking is None:
      tracking = models.InstructorTrackingResult(
        session_id=job.session.id,
        payload=payload,
        created_at=datetime.utcnow(),
      )
      db.add(tracking)
    else:
      tracking.payload = payload
      tracking.created_at = datetime.utcnow()

    job.status = "completed"
    job.progress = 1.0
    job.error = None
    job.finished_at = datetime.utcnow()
    job.session.status = "completed"
    existing_meta = (
      job.session.metadata_json if isinstance(job.session.metadata_json, dict) else {}
    )
    job.session.metadata_json = {
      **existing_meta,
      "processingDiagnostics": diagnostics,
    }
    db.commit()
  except Exception as exc:  # noqa: BLE001
    if "job" in locals() and job is not None:
      video_path = Path(job.session.video_path) if job.session and job.session.video_path else None
      if video_path is not None:
        results_dir = video_path.parent / "results"
        results_dir.mkdir(parents=True, exist_ok=True)
        diagnostics_path = results_dir / "processing-diagnostics.json"
        if not diagnostics_path.exists():
          diagnostics_path.write_text(
            json.dumps({"error": str(exc), "jobId": job_id}, indent=2),
            encoding="utf-8",
          )
      job.status = "failed"
      job.error = str(exc)
      job.finished_at = datetime.utcnow()
      job.session.status = "failed"
      db.commit()
  finally:
    db.close()


def run_worker() -> None:
  redis_conn = Redis.from_url(settings.redis_url)
  q = Queue("processing", connection=redis_conn)
  worker = Worker([q], connection=redis_conn)
  worker.work()


if __name__ == "__main__":
  run_worker()


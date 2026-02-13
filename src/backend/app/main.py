import shutil
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from redis import Redis
from rq import Queue, Worker
from rq.command import send_stop_job_command
from rq.job import Job
from rq.registry import StartedJobRegistry
import uuid
import json

from .config import settings
from .database import SessionLocal, init_db
from . import models, schemas
from .worker import process_job

# Resolve session video path from backend dir so it works regardless of process cwd
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_SESSION_VIDEO_ROOT = _BACKEND_DIR / "data" / "sessions"


def _session_video_path(session) -> Path | None:
  """Path to session's raw.mp4; prefers canonical location under backend/data/sessions."""
  canonical = _SESSION_VIDEO_ROOT / session.session_id / "raw.mp4"
  if canonical.is_file():
    return canonical
  stored = Path(session.video_path)
  if stored.is_file():
    return stored
  return None


def get_db() -> Session:
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


app = FastAPI(title="Option A Backend")

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
  settings.data_root.mkdir(parents=True, exist_ok=True)
  _SESSION_VIDEO_ROOT.mkdir(parents=True, exist_ok=True)
  init_db()


def _generate_session_id() -> str:
  return f"sess-{uuid.uuid4().hex[:8]}"


def _generate_job_id() -> str:
  return f"job-{uuid.uuid4().hex[:8]}"


@app.post("/sessions/import", response_model=schemas.ImportSessionResponse, status_code=201)
async def import_session(
  video: UploadFile = File(...),
  metadata: str | None = Form(default=None),
  db: Session = Depends(get_db),
) -> schemas.ImportSessionResponse:
  """Accept a video upload and create a session + processing job."""
  if not video.filename:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST, detail="Video file must have a filename."
    )

  session_id = _generate_session_id()
  session_dir = _SESSION_VIDEO_ROOT / session_id
  session_dir.mkdir(parents=True, exist_ok=True)

  raw_path = session_dir / "raw.mp4"
  with raw_path.open("wb") as buffer:
    content = await video.read()
    buffer.write(content)

  metadata_obj: dict | None = None
  if metadata:
    try:
      metadata_obj = json.loads(metadata)
    except json.JSONDecodeError:
      metadata_obj = None

  name = metadata_obj.get("sessionName") if isinstance(metadata_obj, dict) else None

  db_session = models.Session(
    session_id=session_id,
    name=name,
    status="processing",
    video_path=str(raw_path),
    created_at=datetime.utcnow(),
    metadata_json=metadata_obj,
  )
  db.add(db_session)
  db.flush()  # obtain db_session.id

  job_id = _generate_job_id()
  job = models.ProcessingJob(
    job_id=job_id,
    session_id=db_session.id,
    status="queued",
    progress=0.0,
    created_at=datetime.utcnow(),
  )
  db.add(job)
  db.commit()

  # Enqueue job for background processing
  try:
    redis_conn = Redis.from_url(settings.redis_url)
    q = Queue(
      "processing",
      connection=redis_conn,
      default_timeout=settings.processing_timeout_seconds + 120,
    )
    q.enqueue(process_job, job_id, job_id=job_id)
  except Exception as e:
    # If Redis is unavailable, log but don't fail the request
    # User can manually trigger processing later
    print(f"Warning: Could not enqueue job {job_id}: {e}")

  return schemas.ImportSessionResponse(jobId=job_id, sessionId=session_id)


@app.get("/jobs/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)) -> schemas.JobResponse:
  job = (
    db.query(models.ProcessingJob)
    .filter(models.ProcessingJob.job_id == job_id)
    .join(models.Session)
    .first()
  )
  if not job:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

  return schemas.JobResponse(
    id=job.job_id,
    status=job.status,
    progress=job.progress,
    sessionId=job.session.session_id,
    createdAt=job.created_at,
    startedAt=job.started_at,
    finishedAt=job.finished_at,
    updatedAt=job.updated_at or job.created_at,
    error=job.error,
  )


@app.get("/jobs", response_model=List[schemas.JobResponse])
def list_jobs(active: bool = False, db: Session = Depends(get_db)) -> List[schemas.JobResponse]:
  query = db.query(models.ProcessingJob).join(models.Session)
  if active:
    query = query.filter(models.ProcessingJob.status.in_(("queued", "running")))
  jobs = query.order_by(models.ProcessingJob.created_at.desc()).all()
  return [
    schemas.JobResponse(
      id=job.job_id,
      status=job.status,
      progress=job.progress,
      sessionId=job.session.session_id,
      createdAt=job.created_at,
      startedAt=job.started_at,
      finishedAt=job.finished_at,
      updatedAt=job.updated_at or job.created_at,
      error=job.error,
    )
    for job in jobs
  ]


@app.get("/queue/health")
def queue_health():
  """
  Basic queue diagnostics so UI can indicate if a worker is connected.
  """
  redis_conn = Redis.from_url(settings.redis_url)
  q = Queue(
    "processing",
    connection=redis_conn,
    default_timeout=settings.processing_timeout_seconds + 120,
  )
  started_registry = StartedJobRegistry("processing", connection=redis_conn)
  workers = Worker.all(connection=redis_conn)

  return {
    "hasWorker": len(workers) > 0,
    "workerCount": len(workers),
    "queuedJobCount": len(q.job_ids),
    "startedJobCount": len(started_registry.get_job_ids()),
  }


@app.post("/queue/recover")
def recover_queue(db: Session = Depends(get_db)):
  """
  Re-enqueue DB jobs that are marked queued but missing from Redis queue.
  Useful after worker restarts/crashes to recover orphaned queued jobs.
  """
  redis_conn = Redis.from_url(settings.redis_url)
  q = Queue(
    "processing",
    connection=redis_conn,
    default_timeout=settings.processing_timeout_seconds + 120,
  )
  started_registry = StartedJobRegistry("processing", connection=redis_conn)

  active_rq_job_ids = set(q.job_ids) | set(started_registry.get_job_ids())
  recovered = 0

  queued_rows = (
    db.query(models.ProcessingJob)
    .filter(models.ProcessingJob.status == "queued")
    .all()
  )

  for row in queued_rows:
    if row.job_id in active_rq_job_ids:
      continue
    q.enqueue(process_job, row.job_id, job_id=row.job_id)
    recovered += 1

  return {"recoveredQueuedJobs": recovered}


@app.get("/sessions", response_model=List[schemas.SessionSummary])
def list_sessions(db: Session = Depends(get_db)) -> List[schemas.SessionSummary]:
  sessions = db.query(models.Session).order_by(models.Session.created_at.desc()).all()
  summaries: list[schemas.SessionSummary] = []
  for s in sessions:
    latest_job = (
      db.query(models.ProcessingJob)
      .filter(models.ProcessingJob.session_id == s.id)
      .order_by(models.ProcessingJob.created_at.desc())
      .first()
    )
    effective_status = s.status
    if latest_job and latest_job.status in ("queued", "running"):
      effective_status = "processing"
    elif latest_job and latest_job.status == "failed":
      effective_status = "failed"
    elif latest_job and latest_job.status == "completed":
      effective_status = "completed"

    summaries.append(
      schemas.SessionSummary(
        sessionId=s.session_id,
        name=s.name,
        createdAt=s.created_at,
        status=effective_status,  # type: ignore[arg-type]
        relatedJobId=latest_job.job_id if latest_job else None,
      )
    )
  return summaries


@app.get(
  "/sessions/{session_id}/media/video",
  response_class=FileResponse,
)
def stream_session_video(session_id: str, db: Session = Depends(get_db)):
  """Stream the session's uploaded video file. Supports range requests for video playback."""
  session = (
    db.query(models.Session).filter(models.Session.session_id == session_id).first()
  )
  if not session:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
  path = _session_video_path(session)
  if not path or not path.is_file():
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found"
    )
  # FileResponse automatically handles range requests (HTTP 206) for video seeking
  return FileResponse(
    path,
    media_type="video/mp4",
    headers={
      "Accept-Ranges": "bytes",
      "Content-Disposition": f'inline; filename="{session.session_id}.mp4"',
    },
  )


@app.get("/sessions/{session_id}", response_model=schemas.SessionDetail)
def get_session_detail(
  session_id: str,
  request: Request,
  db: Session = Depends(get_db),
) -> schemas.SessionDetail:
  session = (
    db.query(models.Session).filter(models.Session.session_id == session_id).first()
  )
  if not session:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

  latest_job = (
    db.query(models.ProcessingJob)
    .filter(models.ProcessingJob.session_id == session.id)
    .order_by(models.ProcessingJob.created_at.desc())
    .first()
  )
  processing_status: schemas.JobStatus = "completed"
  error = None
  if latest_job:
    processing_status = latest_job.status  # type: ignore[assignment]
    error = latest_job.error

  summary = schemas.SessionSummary(
    sessionId=session.session_id,
    name=session.name,
    createdAt=session.created_at,
    status=session.status,  # type: ignore[arg-type]
    relatedJobId=latest_job.job_id if latest_job else None,
  )

  video_url = None
  if _session_video_path(session) is not None:
    # Return path only; frontend will construct full URL using its API_BASE_URL
    video_url = f"/sessions/{session_id}/media/video"

  media = schemas.MediaInfo(
    heatmapVideoUrl=None,
    centralCamUrl=video_url,
    slideDeckUrl=None,
  )

  processing = schemas.ProcessingInfo(status=processing_status, error=error)

  has_tracking = (
    db.query(models.InstructorTrackingResult)
    .filter(models.InstructorTrackingResult.session_id == session.id)
    .first()
    is not None
  )

  return schemas.SessionDetail(
    session=summary,
    media=media,
    processing=processing,
    relatedJobId=latest_job.job_id if latest_job else None,
    hasInstructorTrackingResult=has_tracking,
  )


@app.get(
  "/sessions/{session_id}/results/instructor-tracking",
  response_model=schemas.TrackingResponse,
)
def get_tracking_results(
  session_id: str,
  db: Session = Depends(get_db),
) -> schemas.TrackingResponse:
  session = (
    db.query(models.Session).filter(models.Session.session_id == session_id).first()
  )
  if not session:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

  tracking = (
    db.query(models.InstructorTrackingResult)
    .filter(models.InstructorTrackingResult.session_id == session.id)
    .first()
  )
  if not tracking:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND, detail="Tracking results not available"
    )

  return schemas.TrackingResponse(version="v1", data=tracking.payload)  # type: ignore[arg-type]


@app.post(
  "/sessions/{session_id}/process",
  response_model=schemas.RetryJobResponse,
  status_code=201,
)
def retry_processing(session_id: str, db: Session = Depends(get_db)) -> schemas.RetryJobResponse:
  session = (
    db.query(models.Session).filter(models.Session.session_id == session_id).first()
  )
  if not session:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

  job_id = _generate_job_id()
  job = models.ProcessingJob(
    job_id=job_id,
    session_id=session.id,
    status="queued",
    progress=0.0,
    created_at=datetime.utcnow(),
  )
  db.add(job)
  session.status = "processing"
  db.commit()

  # Enqueue job for background processing
  try:
    redis_conn = Redis.from_url(settings.redis_url)
    q = Queue(
      "processing",
      connection=redis_conn,
      default_timeout=settings.processing_timeout_seconds + 120,
    )
    q.enqueue(process_job, job_id, job_id=job_id)
  except Exception as e:
    # If Redis is unavailable, log but don't fail the request
    print(f"Warning: Could not enqueue job {job_id}: {e}")

  return schemas.RetryJobResponse(jobId=job_id)


@app.delete("/jobs/{job_id}", status_code=204)
def cancel_job(job_id: str, db: Session = Depends(get_db)):
  """Cancel a queued or running job, and delete it from the database."""
  job_row = (
    db.query(models.ProcessingJob)
    .filter(models.ProcessingJob.job_id == job_id)
    .first()
  )
  if not job_row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

  redis_conn = Redis.from_url(settings.redis_url)
  try:
    rq_job = Job.fetch(job_id, connection=redis_conn)
  except Exception:
    rq_job = None

  if rq_job:
    status_str = rq_job.get_status()
    if status_str == "queued":
      rq_job.cancel()
      rq_job.delete()
    elif status_str == "started":
      send_stop_job_command(redis_conn, job_id)

  session = job_row.session
  db.delete(job_row)
  # Reset session status if no other running/queued jobs remain
  remaining = (
    db.query(models.ProcessingJob)
    .filter(models.ProcessingJob.session_id == session.id)
    .filter(models.ProcessingJob.status.in_(("queued", "running")))
    .count()
  )
  if remaining == 0:
    has_completed = (
      db.query(models.ProcessingJob)
      .filter(models.ProcessingJob.session_id == session.id)
      .filter(models.ProcessingJob.status == "completed")
      .first()
    )
    session.status = "completed" if has_completed else "processing"
  db.commit()
  return None


@app.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: str, db: Session = Depends(get_db)):
  """Delete a session and all associated data (jobs, tracking, video files)."""
  session = (
    db.query(models.Session).filter(models.Session.session_id == session_id).first()
  )
  if not session:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

  redis_conn = Redis.from_url(settings.redis_url)
  q = Queue("processing", connection=redis_conn)

  for job_row in session.jobs:
    if job_row.status in ("queued", "running"):
      try:
        rq_job = Job.fetch(job_row.job_id, connection=redis_conn)
        if rq_job.get_status() == "queued":
          rq_job.cancel()
          rq_job.delete()
        elif rq_job.get_status() == "started":
          send_stop_job_command(redis_conn, job_row.job_id)
      except Exception:
        pass

  db.query(models.InstructorTrackingResult).filter(
    models.InstructorTrackingResult.session_id == session.id
  ).delete()
  db.query(models.ProcessingJob).filter(
    models.ProcessingJob.session_id == session.id
  ).delete()
  db.delete(session)
  db.commit()

  session_dir = _SESSION_VIDEO_ROOT / session_id
  if session_dir.exists():
    shutil.rmtree(session_dir, ignore_errors=True)

  return None


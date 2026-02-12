# Backend (Option A: Upload + Jobs + Instructor Tracking)

This backend powers the Option A flow:

- Upload a session recording + metadata.
- Create and track processing jobs.
- Run a (stubbed-for-now) post-processing pipeline.
- Serve instructor tracking results to the React dashboard by `sessionId`.

Stack:

- **FastAPI** (HTTP API)
- **SQLite** via SQLAlchemy
- **RQ/Redis** planned for background jobs (current worker can also be called directly)

---

## 1. Create / use a virtualenv

From the backend directory:

```bash
cd CapstoneProject/src/backend

# If you DON'T already have a venv here:
python -m venv venv

# Activate it (WSL / Linux):
source venv/bin/activate
```

If `venv` already exists (it does in this repo), you can skip creation and just activate it.

---

## 2. Install dependencies

With the virtualenv active in `CapstoneProject/src/backend`:

```bash
pip install -e .
```

This installs everything declared in `pyproject.toml`:

- `fastapi`, `uvicorn[standard]`, `pydantic`
- `sqlalchemy`, `alembic`
- `redis`, `rq`
- `python-multipart`
- `opencv-python-headless`, `numpy`
- `ultralytics` (YOLOv8, for a future non-stub pipeline)

Optional dev tools:

```bash
pip install -e .[dev]
```

---

## 3. How to run locally (all services)

You need **three terminals** running simultaneously:

### Terminal A – Redis

```bash
redis-server
```

If Redis isn't installed, install it first (e.g., `sudo apt-get install redis-server` on Ubuntu/WSL).
For video transcoding (browser playback): `sudo apt-get install ffmpeg`.

### Terminal B – API

```bash
cd CapstoneProject/src/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Notes:

- SQLite DB is created at `data/backend.db` (relative to this directory).
- Session data (uploaded videos) live under: `data/sessions/<sessionId>/raw.mp4`.
- Main endpoints:
  - `POST /sessions/import`
  - `GET /jobs/{jobId}`, `GET /jobs?active=true`
  - `GET /sessions`
  - `GET /sessions/{sessionId}`
  - `GET /sessions/{sessionId}/results/instructor-tracking`
  - `POST /sessions/{sessionId}/process`
  - `DELETE /sessions/{sessionId}` — remove session and all data
  - `DELETE /jobs/{jobId}` — cancel a queued or running job

### Terminal C – Worker

```bash
cd CapstoneProject/src/backend
source venv/bin/activate
python -m app.worker
```

This worker loop will:
- Pull jobs from the Redis queue.
- Run `process_job(jobId)` for each.
- Update job status in the database.

### Frontend (optional, separate shell)

```bash
cd CapstoneProject/src/frontend
export VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Point the frontend at this backend by setting `VITE_API_BASE_URL` before `npm run dev`.

---

## 4. Worker details

The worker currently:

- Transcodes the video to H.264/AAC for browser playback (requires ffmpeg).
- Reads the uploaded video (`data/sessions/<sessionId>/raw.mp4`).
- Decodes metadata with OpenCV (width, height, fps, frame count).
- Generates a **synthetic** instructor track in normalized coordinates.
- Computes simple derived metrics:
  - `coveragePercent`, `gapsCount`, `longestGapSec`, `totalDistance`, `jitter`.
- Stores the payload in `InstructorTrackingResult`.
- Marks the job + session as `completed`.

You can use it in two ways.

### 4.1 Direct call (no queue, good for testing)

From an interactive Python shell with the venv active:

```bash
cd CapstoneProject/src/backend
source venv/bin/activate
python
```

Then:

```python
from app.worker import process_job

process_job("job-xxxxxxx")  # replace with real jobId from POST /sessions/import
```

After this, the tracking payload is available via:

```bash
curl "http://localhost:8000/sessions/<sessionId>/results/instructor-tracking"
```

### 4.2 Future: RQ + Redis loop

When you're ready to use Redis and an actual queue:

1. Start Redis (outside this repo, e.g. `redis-server`).
2. Wire enqueuing in `app/main.py` after creating a job:

   ```python
   from rq import Queue
   from redis import Redis
   from app.worker import process_job

   q = Queue("processing", connection=Redis.from_url(settings.redis_url))
   q.enqueue(process_job, job_id)
   ```

3. Run the worker loop:

   ```bash
   cd CapstoneProject/src/backend
   source venv/bin/activate
   python -m app.worker
   ```

The current code already includes `run_worker()` using RQ’s `Worker`/`Queue`; enqueuing is left as a small follow-up.

---

## 5. Quick manual smoke test

With all three terminals running (Redis, API, Worker):

1. **Import a session** (from another terminal or Postman):

   ```bash
   curl -X POST "http://localhost:8000/sessions/import" \
     -F "video=@/path/to/video.mp4" \
     -F 'metadata={\"sessionName\":\"Test Session\"};type=application/json'
   ```

   This returns `{ "jobId": "...", "sessionId": "..." }`.

2. **Watch the worker terminal** – it should pick up the job and process it automatically.

3. **Check job status**:

   ```bash
   curl "http://localhost:8000/jobs/<jobId>"
   ```

   Should show `status: "completed"` and `progress: 1.0` after processing.

4. **Check sessions**:

   ```bash
   curl "http://localhost:8000/sessions"
   curl "http://localhost:8000/sessions/<sessionId>"
   ```

   The session detail should show `hasInstructorTrackingResult: true` once processing completes.

5. **Fetch tracking results**:

   ```bash
   curl "http://localhost:8000/sessions/<sessionId>/results/instructor-tracking"
   ```

   You should see a `version: "v1"` tracking payload with `frameDetections`, `trackPoints`, and `derivedMetrics` that the frontend can use for overlays and movement metrics.


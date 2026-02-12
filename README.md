# Large Group Eye-Tracking: Visionaries

Developer Names: Ann Shi, Manan Sharma, Angela Zeng, Stanley Chen, Ibrahim Sahi

Date of project start: September 15, 2025

This project explores group eye tracking in classroom settings to better
understand student attention and engagement. Using data from eye-tracking
goggles, the system processes gaze information in real time and displays
analytics on an instructor dashboard. The platform will support both live
visualizations and post session analysis.

The folders and files for this project are as follows:

docs - Documentation for the project
refs - Reference material used for the project, including papers
src - Source code
test - Test cases

## Run The Project Locally

This project has a React frontend and a FastAPI backend.

### Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Redis server
- ffmpeg (used by backend worker for video transcoding)

### Backend Setup (`src/backend`)

```bash
cd src/backend
python -m venv venv
source venv/bin/activate
pip install -e .
```

Run backend services in separate terminals:

```bash
# Terminal 1
redis-server
```

```bash
# Terminal 2
cd src/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 3
cd src/backend
source venv/bin/activate
python -m app.worker
```

Optional detector/tracker config (before starting API/worker):

```bash
export BACKEND_DETECTOR_TYPE="yolov8n"
export BACKEND_DETECTOR_MODEL="yolov8n.pt"
export BACKEND_DETECTOR_DEVICE="cpu"
export BACKEND_TRACKER_TYPE="single-target-iou"
```

See `src/backend/README.md` ("Swap detector / tracker") for how to register new implementations.

### Frontend Setup (`src/frontend`)

```bash
cd src/frontend
npm install
export VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

Open the frontend URL printed by Vite (typically `http://127.0.0.1:5173`).

## Additional Documentation

- Backend details and API usage: `src/backend/README.md`
- Source code overview: `src/README.md`
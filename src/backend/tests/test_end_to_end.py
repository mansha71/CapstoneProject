from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


client = TestClient(app)


def test_import_and_list_sessions(tmp_path: Path, monkeypatch) -> None:
  # Ensure data root exists
  settings.data_root.mkdir(parents=True, exist_ok=True)

  # Create a tiny fake video file (not a real mp4, but enough for path handling)
  fake_video = tmp_path / "fake.mp4"
  fake_video.write_bytes(b"0" * 1024)

  with fake_video.open("rb") as f:
    response = client.post(
      "/sessions/import",
      files={"video": ("fake.mp4", f, "video/mp4")},
      data={"metadata": '{"sessionName":"Test Session"}'},
    )

  assert response.status_code == 201, response.text
  payload = response.json()
  assert "jobId" in payload and "sessionId" in payload

  # Sessions list should include the new session
  sessions_resp = client.get("/sessions")
  assert sessions_resp.status_code == 200
  sessions = sessions_resp.json()
  assert any(s["sessionId"] == payload["sessionId"] for s in sessions)


"""
Minimal proof-of-concept of M5 Reporting module.
- Single file implementation to keep things simple.
- No external dependencies.
- Run with: python3 src/reporting_poc.py
"""
import json
import io
import time
from typing import Dict, List, Optional

# Minimal in-memory auth stub
class InMemoryAuthService:
    def __init__(self, allowed_users: Optional[List[str]] = None):
        self.allowed = set(allowed_users or [])

    def is_authorized(self, user_id: str, action: str) -> bool:
        return user_id in self.allowed


# Minimal in-memory artifact/session store
class InMemoryArtifactService:
    def __init__(self, sessions: Optional[Dict[str, dict]] = None):
        self.sessions = sessions or {}

    def get_session(self, session_id: str) -> Optional[dict]:
        return self.sessions.get(session_id)

    def save_annotation(self, session_id: str, annotation: dict) -> None:
        s = self.sessions.get(session_id)
        if s is None:
            raise ValueError("session_not_found")
        s.setdefault("annotations", []).append(annotation)


# ReportingService
def export_png_placeholder(summary: dict) -> bytes:
    # Placeholder bytes. Real implementation would render charts.
    marker = {"placeholder": "PNG", "sessionId": summary.get("sessionId"), "generatedAt": summary.get("generatedAt")}
    return json.dumps(marker).encode("utf-8")


def export_json(summary: dict) -> str:
    return json.dumps(summary, indent=2)


def export_csv(summary: dict) -> str:
    # Very simple CSV: two tables appended
    buf = io.StringIO()
    writer = None

    # Summary row
    buf.write("sessionId,totalSamples,participantsCount,avgSamplesPerParticipant\n")
    buf.write(f"{summary.get('sessionId')},{summary.get('totalSamples')},{summary.get('participantsCount')},{summary.get('avgSamplesPerParticipant')}\n\n")

    # Per-participant
    buf.write("participantId,samples\n")
    for pid, cnt in (summary.get("samplesPerParticipant") or {}).items():
        buf.write(f"{pid},{cnt}\n")
    buf.write("\n")

    # AOI
    buf.write("aoi,attentionCount\n")
    for aoi, cnt in (summary.get("attentionByAOI") or {}).items():
        buf.write(f"{aoi},{cnt}\n")

    return buf.getvalue()


class ReportingService:
    def __init__(self, auth_service: InMemoryAuthService, artifact_service: InMemoryArtifactService):
        self.auth = auth_service
        self.artifacts = artifact_service

    def generate_post_session_summary(self, session_id: str, user_id: str, slice_start: Optional[int] = None, slice_end: Optional[int] = None) -> dict:
        if not self.auth.is_authorized(user_id, "generate_report"):
            raise PermissionError("unauthorized")

        session = self.artifacts.get_session(session_id)
        if session is None:
            raise ValueError("session_not_found")

        start = slice_start if slice_start is not None else session.get("start")
        end = slice_end if slice_end is not None else session.get("end")

        # Filter gaze events by time slice
        timeline = [g for g in session.get("gaze_events", []) if (start is None or g["timestamp"] >= start) and (end is None or g["timestamp"] <= end)]

        total_samples = len(timeline)
        samples_per_participant = {}
        attention_by_aoi = {}

        for g in timeline:
            pid = g.get("participantId")
            samples_per_participant[pid] = samples_per_participant.get(pid, 0) + 1
            aoi = g.get("aoi")
            if aoi:
                attention_by_aoi[aoi] = attention_by_aoi.get(aoi, 0) + 1

        participants_count = len(samples_per_participant)
        avg_samples = (total_samples / participants_count) if participants_count else 0

        annotations = [a for a in session.get("annotations", []) if not a.get("range") or not (a["range"].get("end", 0) < start or a["range"].get("start", 0) > end)]

        summary = {
            "sessionId": session_id,
            "totalSamples": total_samples,
            "participantsCount": participants_count,
            "samplesPerParticipant": samples_per_participant,
            "avgSamplesPerParticipant": avg_samples,
            "attentionByAOI": attention_by_aoi,
            "timeline": timeline,
            "annotations": annotations,
            "generatedAt": int(time.time() * 1000),
        }
        return summary

    def add_annotation(self, session_id: str, user_id: str, annotation: dict) -> dict:
        if not self.auth.is_authorized(user_id, "add_annotation"):
            raise PermissionError("unauthorized")
        ann = dict(annotation)
        ann.setdefault("id", f"{session_id}-ann-{int(time.time()*1000)}")
        ann.setdefault("timestamp", int(time.time()*1000))
        self.artifacts.save_annotation(session_id, ann)
        return ann


# Tiny demo runner
def main():
    # Create a tiny example session
    session = {
        "id": "sess-1",
        "start": 1672531200000,  # arbitrary
        "end": 1672531260000,
        "gaze_events": [
            {"timestamp": 1672531201000, "participantId": "p1", "aoi": "board", "x": 0.1, "y": 0.1},
            {"timestamp": 1672531202000, "participantId": "p2", "aoi": "screen", "x": 0.2, "y": 0.2},
            {"timestamp": 1672531203000, "participantId": "p1", "aoi": "board", "x": 0.15, "y": 0.15},
        ],
        "annotations": [],
    }

    auth = InMemoryAuthService(allowed_users=["instructor-1"])
    artifacts = InMemoryArtifactService(sessions={session["id"]: session})
    svc = ReportingService(auth, artifacts)

    # Generate summary
    try:
        summary = svc.generate_post_session_summary("sess-1", "instructor-1")
    except Exception as e:
        print("Error generating summary:", e)
        return

    # Exports
    print("JSON export:\n", export_json(summary))
    print("\nCSV export:\n", export_csv(summary))

    png_bytes = export_png_placeholder(summary)
    # write placeholder to a file so user can see it
    with open("report_placeholder.png", "wb") as f:
        f.write(png_bytes)
    print("Wrote placeholder PNG-like file: report_placeholder.png (not a real PNG)")


if __name__ == "__main__":
    main()


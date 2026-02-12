from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


JobStatus = Literal["queued", "running", "completed", "failed"]


class SessionSummary(BaseModel):
  sessionId: str
  name: Optional[str] = None
  createdAt: datetime
  status: Literal["processing", "completed", "failed"]
  relatedJobId: Optional[str] = None


class MediaInfo(BaseModel):
  heatmapVideoUrl: Optional[str] = None
  centralCamUrl: Optional[str] = None
  slideDeckUrl: Optional[str] = None


class ProcessingInfo(BaseModel):
  status: JobStatus
  error: Optional[str] = None


class SessionDetail(BaseModel):
  session: SessionSummary
  media: MediaInfo
  processing: ProcessingInfo
  relatedJobId: Optional[str] = None
  hasInstructorTrackingResult: bool = False


class JobResponse(BaseModel):
  id: str
  status: JobStatus
  progress: float = Field(ge=0.0, le=1.0)
  sessionId: str
  createdAt: datetime
  startedAt: Optional[datetime] = None
  finishedAt: Optional[datetime] = None
  updatedAt: datetime
  error: Optional[str] = None


class ImportSessionResponse(BaseModel):
  jobId: str
  sessionId: str


class TrackingPayload(BaseModel):
  coordinateSystem: Literal["normalized", "pixels"]
  video: dict
  processingMeta: dict
  frameDetections: list[dict]
  trackPoints: list[dict]
  derivedMetrics: dict


class TrackingResponse(BaseModel):
  version: str = "v1"
  data: TrackingPayload


class RetryJobResponse(BaseModel):
  jobId: str


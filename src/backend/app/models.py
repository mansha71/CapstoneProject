from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Session(Base):
  __tablename__ = "sessions"

  id = Column(Integer, primary_key=True, index=True)
  session_id = Column(String, unique=True, index=True, nullable=False)
  name = Column(String, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  status = Column(String, default="processing", nullable=False)
  metadata_json = Column("metadata", JSON, nullable=True)
  video_path = Column(String, nullable=False)
  video_width = Column(Integer, nullable=True)
  video_height = Column(Integer, nullable=True)
  fps = Column(Float, nullable=True)

  jobs = relationship("ProcessingJob", back_populates="session", lazy="selectin")
  tracking_result = relationship(
    "InstructorTrackingResult", back_populates="session", uselist=False, lazy="selectin"
  )


class ProcessingJob(Base):
  __tablename__ = "processing_jobs"

  id = Column(Integer, primary_key=True, index=True)
  job_id = Column(String, unique=True, index=True, nullable=False)
  session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
  status = Column(String, default="queued", nullable=False)
  progress = Column(Float, default=0.0, nullable=False)  # 0..1
  error = Column(Text, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  started_at = Column(DateTime, nullable=True)
  finished_at = Column(DateTime, nullable=True)
  updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

  session = relationship("Session", back_populates="jobs")


class InstructorTrackingResult(Base):
  __tablename__ = "instructor_tracking_results"

  id = Column(Integer, primary_key=True, index=True)
  session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
  payload = Column(JSON, nullable=False)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

  session = relationship("Session", back_populates="tracking_result")


from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Enum
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum


class PriorityLevel(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class SIFClassification(str, enum.Enum):
    CRITICAL = "Critical SIF Potential"
    HIGH = "High SIF Potential"
    REVIEW = "Review Required"
    LOWER = "Lower SIF Potential"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), unique=True, index=True)
    date = Column(String(20))
    location = Column(String(200))
    asset = Column(String(200))
    department = Column(String(200))
    activity = Column(String(200))
    report_type = Column(String(100))
    reporter_type = Column(String(100))
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_synthetic = Column(Integer, default=0)

    prediction = relationship("Prediction", back_populates="report", uselist=False)
    iogp_predictions = relationship("IOGPPrediction", back_populates="report")
    hazards = relationship("ExtractedHazard", back_populates="report")
    controls = relationship("ControlStatus", back_populates="report")
    reviews = relationship("HumanReview", back_populates="report")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), ForeignKey("reports.report_id"), unique=True)
    sif_probability = Column(Float)
    classification = Column(String(100))
    confidence = Column(Float)
    priority = Column(String(50))
    model_version = Column(String(50), default="demo-v1.0")
    evidence = Column(JSON)
    explanation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="prediction")


class IOGPPrediction(Base):
    __tablename__ = "iogp_predictions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), ForeignKey("reports.report_id"))
    rule = Column(String(200))
    probability = Column(Float)

    report = relationship("Report", back_populates="iogp_predictions")


class ExtractedHazard(Base):
    __tablename__ = "extracted_hazards"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), ForeignKey("reports.report_id"))
    hazard = Column(String(200))
    energy_source = Column(String(200))
    exposure = Column(String(200))
    potential_consequence = Column(String(200))

    report = relationship("Report", back_populates="hazards")


class ControlStatus(Base):
    __tablename__ = "controls"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), ForeignKey("reports.report_id"))
    control = Column(String(200))
    status = Column(String(50))

    report = relationship("Report", back_populates="controls")


class HumanReview(Base):
    __tablename__ = "human_reviews"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), ForeignKey("reports.report_id"))
    reviewer = Column(String(200))
    final_sif_label = Column(String(100))
    final_iogp_rules = Column(JSON)
    comments = Column(Text)
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="pending")

    report = relationship("Report", back_populates="reviews")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(200))
    role = Column(String(50), default="hse_analyst")
    full_name = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ReportCreate(BaseModel):
    report_id: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    asset: Optional[str] = None
    department: Optional[str] = None
    activity: Optional[str] = None
    report_type: Optional[str] = None
    reporter_type: Optional[str] = None
    raw_text: str = Field(..., min_length=5, max_length=50000)


class ReportResponse(BaseModel):
    id: int
    report_id: str
    date: Optional[str]
    location: Optional[str]
    asset: Optional[str]
    department: Optional[str]
    activity: Optional[str]
    report_type: Optional[str]
    reporter_type: Optional[str]
    raw_text: str
    created_at: datetime
    is_synthetic: int = 0

    class Config:
        from_attributes = True


class IOGPPredictionItem(BaseModel):
    rule: str
    probability: float


class HazardItem(BaseModel):
    hazard: str
    energy_source: str
    exposure: str
    potential_consequence: str


class ControlItem(BaseModel):
    control: str
    status: str


class AnalysisResult(BaseModel):
    sif_probability: float
    sif_classification: str
    confidence: float
    priority: str
    iogp_rules: List[IOGPPredictionItem]
    hazards: List[str]
    energy_sources: List[str]
    exposures: List[str]
    potential_consequences: List[str]
    failed_controls: List[ControlItem]
    evidence: List[str]
    explanation: str


class PredictionResponse(BaseModel):
    id: int
    report_id: str
    sif_probability: float
    classification: str
    confidence: float
    priority: str
    model_version: str
    evidence: Optional[list]
    explanation: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    report_id: str
    reviewer: str = "HSE Analyst"
    final_sif_label: str
    final_iogp_rules: List[str] = []
    comments: str = ""


class ReviewResponse(BaseModel):
    id: int
    report_id: str
    reviewer: str
    final_sif_label: str
    final_iogp_rules: Optional[list]
    comments: Optional[str]
    reviewed_at: datetime
    status: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class DashboardStats(BaseModel):
    total_reports: int
    sif_potential_reports: int
    critical_reports: int
    high_priority_reports: int
    awaiting_review: int
    reviewed_reports: int
    corrective_actions_open: int
    corrective_actions_closed: int


class AnalyticsData(BaseModel):
    sif_distribution: dict
    iogp_distribution: dict
    top_hazards: list
    top_controls: list
    reports_by_location: list
    reports_by_activity: list
    ai_vs_human: dict
    insights: list

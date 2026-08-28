from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from collections import Counter

from app.core.database import get_db
from app.models.database import (
    Report, Prediction, IOGPPrediction, ExtractedHazard,
    ControlStatus, HumanReview
)

router = APIRouter()


@router.get("/analytics/dashboard")
def dashboard_stats(db: Session = Depends(get_db)):
    total_reports = db.query(Report).count()

    sif_potential = db.query(Prediction).filter(
        Prediction.classification.in_(["Critical SIF Potential", "High SIF Potential"])
    ).count()

    critical = db.query(Prediction).filter(Prediction.priority == "Critical").count()
    high_priority = db.query(Prediction).filter(Prediction.priority == "High").count()

    reviewed_ids = db.query(HumanReview.report_id).distinct().subquery()
    reviewed = db.query(Report).filter(Report.report_id.in_(reviewed_ids)).count()
    awaiting_review = total_reports - reviewed

    return {
        "total_reports": total_reports,
        "sif_potential_reports": sif_potential,
        "critical_reports": critical,
        "high_priority_reports": high_priority,
        "awaiting_review": awaiting_review,
        "reviewed_reports": reviewed,
        "corrective_actions_open": max(0, critical + high_priority - reviewed),
        "corrective_actions_closed": min(reviewed, critical + high_priority)
    }


@router.get("/analytics/sif")
def sif_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        Prediction.classification,
        func.count(Prediction.id)
    ).group_by(Prediction.classification).all()

    return {"distribution": {d[0]: d[1] for d in dist}}


@router.get("/analytics/sif-trend")
def sif_trend(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.date).all()
    trend = {}
    for r in reports:
        pred = db.query(Prediction).filter(Prediction.report_id == r.report_id).first()
        if pred and r.date:
            month = r.date[:7]
            if month not in trend:
                trend[month] = {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
            trend[month]["total"] += 1
            if pred.priority in trend[month]:
                trend[month][pred.priority.lower()] += 1
    return {"trend": trend}


@router.get("/analytics/iogp")
def iogp_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        IOGPPrediction.rule,
        func.count(IOGPPrediction.id)
    ).group_by(IOGPPrediction.rule).all()

    return {"distribution": {d[0]: d[1] for d in dist}}


@router.get("/analytics/hazards")
def hazard_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        ExtractedHazard.hazard,
        func.count(ExtractedHazard.id)
    ).group_by(ExtractedHazard.hazard).all()

    return {"distribution": {d[0]: d[1] for d in dist}}


@router.get("/analytics/controls")
def control_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        ControlStatus.control,
        ControlStatus.status,
        func.count(ControlStatus.id)
    ).group_by(ControlStatus.control, ControlStatus.status).all()

    result = {}
    for control, status, count in dist:
        if control not in result:
            result[control] = {}
        result[control][status] = count

    return {"distribution": result}


@router.get("/analytics/locations")
def location_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        Report.location,
        func.count(Report.id)
    ).group_by(Report.location).all()

    return {"distribution": {d[0]: d[1] for d in dist}}


@router.get("/analytics/activities")
def activity_distribution(db: Session = Depends(get_db)):
    dist = db.query(
        Report.activity,
        func.count(Report.id)
    ).group_by(Report.activity).all()

    return {"distribution": {d[0]: d[1] for d in dist}}


@router.get("/analytics/ai-human")
def ai_human_agreement(db: Session = Depends(get_db)):
    reviews = db.query(HumanReview).all()
    accepted = sum(1 for r in reviews if r.status == "accepted")
    overridden = sum(1 for r in reviews if r.status == "overridden")
    total_pred = db.query(Prediction).count()
    total_reviewed = len(reviews)

    return {
        "accepted": accepted,
        "overridden": overridden,
        "needs_review": total_pred - total_reviewed,
        "total_predictions": total_pred,
        "total_reviewed": total_reviewed
    }


@router.get("/analytics/insights")
def safety_insights(db: Session = Depends(get_db)):
    insights = []

    # Most common SIF-related IOGP rule
    top_rule = db.query(
        IOGPPrediction.rule, func.count(IOGPPrediction.id)
    ).group_by(IOGPPrediction.rule).order_by(func.count(IOGPPrediction.id).desc()).first()
    if top_rule:
        insights.append({
            "type": "trend",
            "message": f"{top_rule[0]} is the most common SIF-related rule with {top_rule[1]} detected reports.",
            "severity": "info"
        })

    # Failed controls
    failed_controls = db.query(
        ControlStatus.control, func.count(ControlStatus.id)
    ).filter(ControlStatus.status.in_(["Failed", "Missing"])).group_by(
        ControlStatus.control
    ).order_by(func.count(ControlStatus.id).desc()).first()
    if failed_controls:
        insights.append({
            "type": "alert",
            "message": f"{failed_controls[0]} is the most frequently detected failed or missing control ({failed_controls[1]} instances).",
            "severity": "warning"
        })

    # Critical reports
    critical_count = db.query(Prediction).filter(Prediction.priority == "Critical").count()
    if critical_count > 0:
        insights.append({
            "type": "alert",
            "message": f"{critical_count} reports have been classified as Critical SIF Potential and require immediate HSE review.",
            "severity": "critical"
        })

    # Top hazards
    top_hazard = db.query(
        ExtractedHazard.hazard, func.count(ExtractedHazard.id)
    ).group_by(ExtractedHazard.hazard).order_by(func.count(ExtractedHazard.id).desc()).first()
    if top_hazard:
        insights.append({
            "type": "trend",
            "message": f"{top_hazard[0]} is the most frequently detected hazard across all reports ({top_hazard[1]} reports).",
            "severity": "info"
        })

    # Pending reviews
    reviewed_ids = db.query(HumanReview.report_id).distinct().subquery()
    pending = db.query(Report).filter(Report.report_id.notin_(reviewed_ids)).count()
    if pending > 0:
        insights.append({
            "type": "action",
            "message": f"{pending} reports are awaiting HSE review. Prioritize Critical and High priority reports.",
            "severity": "warning"
        })

    return {"insights": insights}

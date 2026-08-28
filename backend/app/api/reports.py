import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.database import (
    Report, Prediction, IOGPPrediction, ExtractedHazard,
    ControlStatus, HumanReview, User
)
from app.models.schemas import ReportCreate, ReportResponse, ReviewCreate, ReviewResponse
from app.services.ai_engine import analyze_report
from app.services.auth import get_current_user

router = APIRouter()


def generate_report_id():
    return f"RPT-{uuid.uuid4().hex[:8].upper()}"


@router.post("/reports")
def create_report(report: ReportCreate, db: Session = Depends(get_db)):
    report_id = report.report_id or generate_report_id()

    existing = db.query(Report).filter(Report.report_id == report_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Report {report_id} already exists")

    db_report = Report(
        report_id=report_id,
        date=report.date,
        location=report.location,
        asset=report.asset,
        department=report.department,
        activity=report.activity,
        report_type=report.report_type,
        reporter_type=report.reporter_type,
        raw_text=report.raw_text,
        created_at=datetime.utcnow()
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return {"report_id": db_report.report_id, "id": db_report.id, "message": "Report created"}


@router.post("/reports/{report_id}/analyze")
def analyze_existing_report(report_id: str, db: Session = Depends(get_db)):
    db_report = db.query(Report).filter(Report.report_id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")

    existing_pred = db.query(Prediction).filter(Prediction.report_id == report_id).first()
    if existing_pred:
        db.delete(existing_pred)
    db.query(IOGPPrediction).filter(IOGPPrediction.report_id == report_id).delete()
    db.query(ExtractedHazard).filter(ExtractedHazard.report_id == report_id).delete()
    db.query(ControlStatus).filter(ControlStatus.report_id == report_id).delete()

    analysis = analyze_report(db_report.raw_text)

    prediction = Prediction(
        report_id=report_id,
        sif_probability=analysis["sif_probability"],
        classification=analysis["sif_classification"],
        confidence=analysis["confidence"],
        priority=analysis["priority"],
        model_version="demo-v1.0",
        evidence=analysis["evidence"],
        explanation=analysis["explanation"],
        created_at=datetime.utcnow()
    )
    db.add(prediction)

    for rule in analysis["iogp_rules"]:
        db.add(IOGPPrediction(report_id=report_id, rule=rule["rule"], probability=rule["probability"]))

    for h in analysis["hazards"]:
        for es in analysis["energy_sources"][:1]:
            for exp in analysis["exposures"][:1]:
                for pc in analysis["potential_consequences"][:1]:
                    db.add(ExtractedHazard(
                        report_id=report_id, hazard=h,
                        energy_source=es, exposure=exp, potential_consequence=pc
                    ))

    for ctrl in analysis["failed_controls"]:
        db.add(ControlStatus(report_id=report_id, control=ctrl["control"], status=ctrl["status"]))

    db.commit()

    return {
        "report_id": report_id,
        "analysis": analysis,
        "message": "Analysis complete"
    }


@router.post("/analyze-text")
def analyze_text_directly(report: ReportCreate, db: Session = Depends(get_db)):
    report_id = report.report_id or generate_report_id()

    db_report = Report(
        report_id=report_id,
        date=report.date or datetime.utcnow().strftime("%Y-%m-%d"),
        location=report.location or "Not specified",
        asset=report.asset or "Not specified",
        department=report.department or "Not specified",
        activity=report.activity or "Not specified",
        report_type=report.report_type or "Safety Report",
        reporter_type=report.reporter_type or "Employee",
        raw_text=report.raw_text,
        created_at=datetime.utcnow()
    )
    db.add(db_report)
    db.flush()

    analysis = analyze_report(report.raw_text)

    prediction = Prediction(
        report_id=report_id,
        sif_probability=analysis["sif_probability"],
        classification=analysis["sif_classification"],
        confidence=analysis["confidence"],
        priority=analysis["priority"],
        model_version="demo-v1.0",
        evidence=analysis["evidence"],
        explanation=analysis["explanation"],
        created_at=datetime.utcnow()
    )
    db.add(prediction)

    for rule in analysis["iogp_rules"]:
        db.add(IOGPPrediction(report_id=report_id, rule=rule["rule"], probability=rule["probability"]))

    for h in analysis["hazards"]:
        for es in analysis["energy_sources"][:1]:
            for exp in analysis["exposures"][:1]:
                for pc in analysis["potential_consequences"][:1]:
                    db.add(ExtractedHazard(
                        report_id=report_id, hazard=h,
                        energy_source=es, exposure=exp, potential_consequence=pc
                    ))

    for ctrl in analysis["failed_controls"]:
        db.add(ControlStatus(report_id=report_id, control=ctrl["control"], status=ctrl["status"]))

    db.commit()

    return {
        "report_id": report_id,
        "report": {
            "report_id": report_id,
            "date": db_report.date,
            "location": db_report.location,
            "asset": db_report.asset,
            "department": db_report.department,
            "activity": db_report.activity,
            "raw_text": db_report.raw_text,
        },
        "analysis": analysis
    }


@router.get("/reports")
def list_reports(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    sif_classification: Optional[str] = None,
    priority: Optional[str] = None,
    location: Optional[str] = None,
    iogp_rule: Optional[str] = None,
    hazard: Optional[str] = None,
    report_type: Optional[str] = None,
    department: Optional[str] = None,
    reviewed: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Report)

    if search:
        search_term = f"%{search}%"
        query = query.filter(Report.raw_text.ilike(search_term))

    if location:
        query = query.filter(Report.location.ilike(f"%{location}%"))

    if report_type:
        query = query.filter(Report.report_type == report_type)

    if department:
        query = query.filter(Report.department == department)

    # Join with prediction for classification/priority filters
    if sif_classification or priority:
        query = query.join(Prediction, Report.report_id == Prediction.report_id)
        if sif_classification:
            query = query.filter(Prediction.classification == sif_classification)
        if priority:
            query = query.filter(Prediction.priority == priority)

    if iogp_rule:
        report_ids = db.query(IOGPPrediction.report_id).filter(
            IOGPPrediction.rule == iogp_rule
        ).subquery()
        query = query.filter(Report.report_id.in_(report_ids))

    if hazard:
        report_ids = db.query(ExtractedHazard.report_id).filter(
            ExtractedHazard.hazard.ilike(f"%{hazard}%")
        ).subquery()
        query = query.filter(Report.report_id.in_(report_ids))

    if reviewed == "yes":
        reviewed_ids = db.query(HumanReview.report_id).subquery()
        query = query.filter(Report.report_id.in_(reviewed_ids))
    elif reviewed == "no":
        reviewed_ids = db.query(HumanReview.report_id).subquery()
        query = query.filter(Report.report_id.notin_(reviewed_ids))

    total = query.count()
    reports = query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for r in reports:
        pred = db.query(Prediction).filter(Prediction.report_id == r.report_id).first()
        review = db.query(HumanReview).filter(HumanReview.report_id == r.report_id).first()
        results.append({
            "id": r.id,
            "report_id": r.report_id,
            "date": r.date,
            "location": r.location,
            "asset": r.asset,
            "department": r.department,
            "activity": r.activity,
            "report_type": r.report_type,
            "reporter_type": r.reporter_type,
            "raw_text": r.raw_text,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "is_synthetic": r.is_synthetic,
            "prediction": {
                "sif_probability": pred.sif_probability if pred else None,
                "classification": pred.classification if pred else None,
                "priority": pred.priority if pred else None,
                "confidence": pred.confidence if pred else None,
            } if pred else None,
            "review_status": review.status if review else "pending"
        })

    return {"total": total, "reports": results}


@router.get("/reports/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db)):
    r = db.query(Report).filter(Report.report_id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    pred = db.query(Prediction).filter(Prediction.report_id == report_id).first()
    iogp = db.query(IOGPPrediction).filter(IOGPPrediction.report_id == report_id).all()
    hazards = db.query(ExtractedHazard).filter(ExtractedHazard.report_id == report_id).all()
    controls = db.query(ControlStatus).filter(ControlStatus.report_id == report_id).all()
    reviews = db.query(HumanReview).filter(HumanReview.report_id == report_id).order_by(HumanReview.reviewed_at.desc()).all()

    return {
        "id": r.id,
        "report_id": r.report_id,
        "date": r.date,
        "location": r.location,
        "asset": r.asset,
        "department": r.department,
        "activity": r.activity,
        "report_type": r.report_type,
        "reporter_type": r.reporter_type,
        "raw_text": r.raw_text,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "is_synthetic": r.is_synthetic,
        "prediction": {
            "id": pred.id,
            "sif_probability": pred.sif_probability,
            "classification": pred.classification,
            "confidence": pred.confidence,
            "priority": pred.priority,
            "model_version": pred.model_version,
            "evidence": pred.evidence,
            "explanation": pred.explanation,
            "created_at": pred.created_at.isoformat() if pred.created_at else None,
        } if pred else None,
        "iogp_rules": [{"rule": i.rule, "probability": i.probability} for i in iogp],
        "hazards": [
            {"hazard": h.hazard, "energy_source": h.energy_source,
             "exposure": h.exposure, "potential_consequence": h.potential_consequence}
            for h in hazards
        ],
        "controls": [{"control": c.control, "status": c.status} for c in controls],
        "reviews": [
            {"id": rv.id, "reviewer": rv.reviewer, "final_sif_label": rv.final_sif_label,
             "final_iogp_rules": rv.final_iogp_rules, "comments": rv.comments,
             "reviewed_at": rv.reviewed_at.isoformat() if rv.reviewed_at else None,
             "status": rv.status}
            for rv in reviews
        ]
    }


@router.post("/reviews")
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    pred = db.query(Prediction).filter(Prediction.report_id == review.report_id).first()
    status_label = "accepted"
    if pred and review.final_sif_label != pred.classification:
        status_label = "overridden"

    db_review = HumanReview(
        report_id=review.report_id,
        reviewer=review.reviewer,
        final_sif_label=review.final_sif_label,
        final_iogp_rules=review.final_iogp_rules,
        comments=review.comments,
        reviewed_at=datetime.utcnow(),
        status=status_label
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    return {
        "id": db_review.id,
        "report_id": db_review.report_id,
        "status": status_label,
        "message": f"Review recorded as {status_label}"
    }


@router.get("/reviews")
def list_reviews(db: Session = Depends(get_db)):
    reviews = db.query(HumanReview).order_by(HumanReview.reviewed_at.desc()).all()
    return [
        {
            "id": rv.id,
            "report_id": rv.report_id,
            "reviewer": rv.reviewer,
            "final_sif_label": rv.final_sif_label,
            "final_iogp_rules": rv.final_iogp_rules,
            "comments": rv.comments,
            "reviewed_at": rv.reviewed_at.isoformat() if rv.reviewed_at else None,
            "status": rv.status
        }
        for rv in reviews
    ]


@router.get("/pending-reviews")
def pending_reviews(db: Session = Depends(get_db)):
    reviewed_ids = db.query(HumanReview.report_id).subquery()
    pending = db.query(Report).filter(Report.report_id.notin_(reviewed_ids)).all()

    results = []
    for r in pending:
        pred = db.query(Prediction).filter(Prediction.report_id == r.report_id).first()
        if pred:
            results.append({
                "id": r.id,
                "report_id": r.report_id,
                "date": r.date,
                "location": r.location,
                "activity": r.activity,
                "raw_text": r.raw_text[:200],
                "prediction": {
                    "sif_probability": pred.sif_probability,
                    "classification": pred.classification,
                    "priority": pred.priority,
                    "confidence": pred.confidence,
                }
            })
    return results


@router.post("/batch-upload")
async def batch_upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    required_fields = ["report_id", "date", "location", "text"]
    if not all(field in (reader.fieldnames or []) for field in required_fields):
        # Try alternate field names
        if "raw_text" in (reader.fieldnames or []):
            pass  # accept raw_text as alternate for text
        else:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must contain columns: {required_fields}"
            )

    results = []
    for row in reader:
        raw_text = row.get("text") or row.get("raw_text", "")
        if not raw_text or len(raw_text.strip()) < 5:
            continue

        report_id = row.get("report_id") or generate_report_id()

        db_report = Report(
            report_id=report_id,
            date=row.get("date", ""),
            location=row.get("location", ""),
            asset=row.get("asset", ""),
            department=row.get("department", ""),
            activity=row.get("activity", ""),
            report_type=row.get("report_type", ""),
            reporter_type=row.get("reporter_type", ""),
            raw_text=raw_text,
            created_at=datetime.utcnow()
        )
        db.add(db_report)
        db.flush()

        analysis = analyze_report(raw_text)

        prediction = Prediction(
            report_id=report_id,
            sif_probability=analysis["sif_probability"],
            classification=analysis["sif_classification"],
            confidence=analysis["confidence"],
            priority=analysis["priority"],
            model_version="demo-v1.0",
            evidence=analysis["evidence"],
            explanation=analysis["explanation"],
            created_at=datetime.utcnow()
        )
        db.add(prediction)

        for rule in analysis["iogp_rules"]:
            db.add(IOGPPrediction(report_id=report_id, rule=rule["rule"], probability=rule["probability"]))

        for h in analysis["hazards"]:
            for es in analysis["energy_sources"][:1]:
                for exp in analysis["exposures"][:1]:
                    for pc in analysis["potential_consequences"][:1]:
                        db.add(ExtractedHazard(
                            report_id=report_id, hazard=h,
                            energy_source=es, exposure=exp, potential_consequence=pc
                        ))

        for ctrl in analysis["failed_controls"]:
            db.add(ControlStatus(report_id=report_id, control=ctrl["control"], status=ctrl["status"]))

        results.append({
            "report_id": report_id,
            "sif_probability": analysis["sif_probability"],
            "classification": analysis["sif_classification"],
            "priority": analysis["priority"]
        })

    db.commit()

    return {
        "total_processed": len(results),
        "critical": len([r for r in results if r["priority"] == "Critical"]),
        "high": len([r for r in results if r["priority"] == "High"]),
        "medium": len([r for r in results if r["priority"] == "Medium"]),
        "low": len([r for r in results if r["priority"] == "Low"]),
        "results": results
    }


@router.get("/export-csv")
def export_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Report ID", "Date", "Location", "Activity", "SIF Probability",
        "SIF Classification", "Priority", "IOGP Rules", "Hazards",
        "Energy Sources", "Exposures", "Failed Controls", "Review Status"
    ])

    reports = db.query(Report).all()
    for r in reports:
        pred = db.query(Prediction).filter(Prediction.report_id == r.report_id).first()
        iogp = db.query(IOGPPrediction).filter(IOGPPrediction.report_id == r.report_id).all()
        hazards = db.query(ExtractedHazard).filter(ExtractedHazard.report_id == r.report_id).all()
        controls = db.query(ControlStatus).filter(ControlStatus.report_id == r.report_id).all()
        review = db.query(HumanReview).filter(HumanReview.report_id == r.report_id).first()

        writer.writerow([
            r.report_id, r.date, r.location, r.activity,
            pred.sif_probability if pred else "",
            pred.classification if pred else "",
            pred.priority if pred else "",
            "; ".join([i.rule for i in iogp]),
            "; ".join(set([h.hazard for h in hazards])),
            "; ".join(set([h.energy_source for h in hazards])),
            "; ".join(set([h.exposure for h in hazards])),
            "; ".join([f"{c.control} ({c.status})" for c in controls]),
            review.status if review else "pending"
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sifguard_export.csv"}
    )


@router.get("/sample-csv")
def sample_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["report_id", "date", "location", "asset", "department", "activity", "report_type", "text"])
    writer.writerow(["SAMPLE-001", "2025-01-15", "Asset A", "Processing", "Maintenance", "Pump repair", "Unsafe Act",
                      "During pump maintenance, the contractor opened the flange without verifying zero-energy isolation. Residual pressure caused an unexpected release."])
    writer.writerow(["SAMPLE-002", "2025-01-16", "Asset B", "Electrical", "Electrical", "Switchgear work", "Unsafe Act",
                      "An electrician worked on live electrical equipment without proper LOTO procedures. Arc flash occurred."])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sifguard_sample_template.csv"}
    )

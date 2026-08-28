from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.database import IOGPPrediction, Prediction
from app.services.ai_engine import IOGP_RULES

router = APIRouter()


@router.get("/iogp-rules")
def get_iogp_rules(db: Session = Depends(get_db)):
    results = []
    for rule in IOGP_RULES:
        report_count = db.query(IOGPPrediction).filter(
            IOGPPrediction.rule == rule["name"]
        ).count()

        report_ids_with_rule = db.query(IOGPPrediction.report_id).filter(
            IOGPPrediction.rule == rule["name"]
        ).subquery()
        high_sif = db.query(Prediction).filter(
            Prediction.report_id.in_(report_ids_with_rule),
            Prediction.classification.in_(["Critical SIF Potential", "High SIF Potential"])
        ).count()

        results.append({
            "id": rule["id"],
            "name": rule["name"],
            "description": rule["description"],
            "keywords": rule["keywords"],
            "related_hazards": rule["related_hazards"],
            "related_energy_sources": rule["related_energy_sources"],
            "example_phrases": rule["example_phrases"],
            "report_count": report_count,
            "sif_potential_count": high_sif
        })

    return results


@router.get("/model/performance")
def model_performance():
    return {
        "model_version": "demo-v1.0",
        "model_type": "Rule-Based Domain-Aware NLP",
        "training_records": "N/A (Demo Mode)",
        "validation_records": "N/A (Demo Mode)",
        "test_records": "N/A (Demo Mode)",
        "metrics": {
            "precision": {"value": None, "note": "DEMONSTRATION / PLACEHOLDER METRICS"},
            "recall": {"value": None, "note": "Not yet trained on real data"},
            "f1": {"value": None, "note": "Requires training dataset"},
            "pr_auc": {"value": None, "note": "Requires training dataset"},
            "roc_auc": {"value": None, "note": "Requires training dataset"},
            "sif_recall": {"value": None, "note": "Requires labeled SIF dataset"},
            "iogp_macro_f1": {"value": None, "note": "Requires labeled IOGP dataset"},
        },
        "model_comparison": [
            {"model": "TF-IDF + Logistic Regression", "precision": "Not trained", "recall": "Not trained", "f1": "Not trained", "pr_auc": "Not trained", "sif_recall": "Not trained"},
            {"model": "TF-IDF + SVM", "precision": "Not trained", "recall": "Not trained", "f1": "Not trained", "pr_auc": "Not trained", "sif_recall": "Not trained"},
            {"model": "Random Forest", "precision": "Not trained", "recall": "Not trained", "f1": "Not trained", "pr_auc": "Not trained", "sif_recall": "Not trained"},
            {"model": "Transformer (BERT/RoBERTa)", "precision": "Not trained", "recall": "Not trained", "f1": "Not trained", "pr_auc": "Not trained", "sif_recall": "Not trained"},
            {"model": "Hybrid Model (NLP + Knowledge)", "precision": "Not trained", "recall": "Not trained", "f1": "Not trained", "pr_auc": "Not trained", "sif_recall": "Not trained"},
        ],
        "disclaimer": "All metrics shown are DEMONSTRATION / PLACEHOLDER METRICS. No model has been trained on real OIL incident data. These values will be replaced with actual metrics once a training dataset is available.",
        "ml_architecture": {
            "demo_mode": "Rule-based deterministic inference with domain knowledge",
            "planned_mode": "Transformer Encoder → Multi-Head Classification → SIF + IOGP",
            "components": [
                "Transformer Encoder (BERT/RoBERTa)",
                "SIF Classification Head (binary/multi-class)",
                "IOGP Multi-label Classification Head",
                "Knowledge Augmentation Layer",
                "Confidence Calibration"
            ]
        }
    }


@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "SIF-GUARD", "version": "1.0.0"}

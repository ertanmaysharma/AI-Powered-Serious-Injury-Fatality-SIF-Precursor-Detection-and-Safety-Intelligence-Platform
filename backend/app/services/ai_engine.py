import json
import os
import re
from pathlib import Path
from typing import List, Dict, Tuple

# Use pathlib for robust path resolution that works regardless of CWD
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"


def load_knowledge(filename: str) -> list:
    filepath = KNOWLEDGE_DIR / filename
    with open(filepath, "r") as f:
        return json.load(f)


# Load knowledge at module level
IOGP_RULES = load_knowledge("iogp_rules.json")
ALL_HAZARDS = load_knowledge("hazards.json")
ALL_ENERGY_SOURCES = load_knowledge("energy_sources.json")
ALL_CONTROL_FAILURES = load_knowledge("control_failures.json")
ALL_CONSEQUENCES = load_knowledge("consequences.json")


# ── Negation handling ──────────────────────────────────────────────────────
NEGATION_WORDS = {"not", "no", "without", "never", "neither", "nor", "none", "cannot", "didn't", "doesn't", "hadn't", "hasn't", "haven't", "isn't", "wasn't", "weren't", "won't", "wouldn't", "failed", "missing", "absent", "lacking", "omitted", "skipped", "bypassed", "disabled", "removed", "ignored", "neglected"}


def detect_negation(text: str, keyword: str) -> bool:
    """Check if a keyword appears in a negated context."""
    text_lower = text.lower()
    kw_lower = keyword.lower()

    patterns = [
        rf'\b{re.escape(neg)}\s+\w*\s*{re.escape(kw_lower)}'
        for neg in NEGATION_WORDS
    ]
    patterns += [
        rf'\b{re.escape(kw_lower)}\s+(?:was\s+)?(?:not|no|never|missing|absent|bypassed|disabled|removed|failed|skipped)'
    ]

    for pattern in patterns:
        if re.search(pattern, text_lower):
            return True
    return False


def find_phrase_in_text(text: str, phrase: str) -> bool:
    """Check if a phrase exists in text, accounting for common variations."""
    text_lower = text.lower().strip()
    phrase_lower = phrase.lower().strip()

    if phrase_lower in text_lower:
        return True

    # Try without extra spaces
    text_normalized = re.sub(r'\s+', ' ', text_lower)
    phrase_normalized = re.sub(r'\s+', ' ', phrase_lower)
    return phrase_normalized in text_normalized


# ── Keyword matching with context scoring ──────────────────────────────────
def score_keyword_match(text: str, keyword: str, weight: float = 1.0) -> float:
    """Score a keyword match considering negation."""
    text_lower = text.lower()
    kw_lower = keyword.lower()

    count = text_lower.count(kw_lower)
    if count == 0:
        return 0.0

    base_score = min(count * 0.3, 1.0) * weight

    if detect_negation(text, keyword):
        return base_score * 0.5  # Negated but still relevant (control failure)

    return base_score


# ── Hazard extraction ──────────────────────────────────────────────────────
HAZARD_KEYWORD_MAP = {
    "hydrocarbon": ["hydrocarbon", "gas release", "oil release", "petroleum", "crude", "fuel", "naphtha"],
    "fire": ["fire", "flame", "combustion", "burning", "ignited", "burn"],
    "explosion": ["explosion", "detonation", "blast", "bleve"],
    "electricity": ["electric", "electrical", "electrocution", "live wire", "energized", "energised", "shock"],
    "pressure": ["pressure", "pressurized", "pressurised", "high pressure", "residual pressure", "pressure release", "overpressure"],
    "mechanical equipment": ["mechanical", "equipment", "machine", "machinery"],
    "toxic atmosphere": ["toxic", "toxic gas", "h2s", "hydrogen sulfide", "fume", "vapour", "vapor"],
    "working at height": ["height", "elevated", "scaffold", "ladder", "roof", "platform"],
    "vehicle": ["vehicle", "truck", "car", "forklift", "transport", "driving"],
    "suspended load": ["suspended load", "overhead load", "hanging load", "lifted load", "load above"],
    "rotating equipment": ["rotating", "spinning", "rotation", "turning"],
    "chemical exposure": ["chemical", "acid", "caustic", "solvent", "exposure"],
    "stored energy": ["stored energy", "residual energy", "spring energy", "capacitor"],
    "falling object": ["falling object", "falling", "dropped", "overhead", "falling material"],
    "crush": ["crush", "crushing", "trapped", "caught between", "pinch point"],
}

EXPOSURE_KEYWORDS = {
    "Worker exposed": ["worker", "personnel", "employee", "technician", "operator"],
    "Contractor exposed": ["contractor", "subcontractor", "external"],
    "Person inside exclusion zone": ["exclusion zone", "inside zone", "restricted area"],
    "Person below suspended load": ["below", "underneath", "under", "beneath"],
    "Person near energized equipment": ["near energized", "near live", "close to electrical", "near energised"],
    "Person exposed to toxic atmosphere": ["toxic atmosphere", "h2s exposure", "inhalation"],
    "Person exposed to pressure release": ["pressure release", "jet", "spray"],
    "Person in line of fire": ["line of fire", "trajectory path", "struck by"],
}

CONSEQUENCE_KEYWORDS = {
    "Fatality": ["death", "fatal", "killed", "fatality", "loss of life", "died"],
    "Amputation": ["amputation", "amputated", "severed", "loss of limb"],
    "Crush injury": ["crush", "crushing", "trapped", "compressed"],
    "Fall": ["fall", "fell", "plummeted", "dropped from height"],
    "Electrocution": ["electrocution", "electric shock", "shocked", "electrocuted"],
    "Burn": ["burn", "burned", "scalded", "thermal injury", "flame burn"],
    "Explosion": ["explosion", "blast injury", "overpressure"],
    "Fire": ["fire", "fire damage", "burned"],
    "Toxic exposure": ["toxic exposure", "poisoning", "inhalation injury"],
    "Asphyxiation": ["asphyxiation", "suffocation", "oxygen deprivation"],
    "Serious injury": ["serious injury", "disabling injury", "major injury", "permanent injury"],
    "Struck-by injury": ["struck by", "hit by", "impact injury"],
}


def extract_hazards(text: str) -> List[str]:
    """Extract hazard entities from report text."""
    text_lower = text.lower()
    found = []
    for hazard, keywords in HAZARD_KEYWORD_MAP.items():
        for kw in keywords:
            if kw in text_lower:
                if not detect_negation(text, kw):
                    found.append(hazard.title())
                    break
    return found if found else ["General hazard"]


def extract_energy_sources(text: str) -> List[str]:
    """Extract energy sources from report text."""
    text_lower = text.lower()
    energy_patterns = {
        "Electrical": ["electric", "electrical", "voltage", "power", "live wire", "energized"],
        "Mechanical": ["mechanical", "machine", "equipment", "rotating", "moving"],
        "Pressure": ["pressure", "pressurized", "hydraulic pressure", "pneumatic pressure"],
        "Thermal": ["thermal", "heat", "hot", "flame", "fire", "welding", "temperature"],
        "Chemical": ["chemical", "chemical reaction", "corrosive", "acid"],
        "Gravity": ["gravity", "fall", "height", "elevated", "suspended", "overhead"],
        "Hydraulic": ["hydraulic", "hydraulics", "hydraulic fluid"],
        "Pneumatic": ["pneumatic", "air pressure", "compressed air"],
        "Stored energy": ["stored energy", "residual energy", "spring", "capacitor", "compressed spring"],
        "Kinetic": ["kinetic", "moving", "velocity", "impact", "vehicle"],
    }

    found = []
    for source, keywords in energy_patterns.items():
        for kw in keywords:
            if kw in text_lower:
                if not detect_negation(text, kw):
                    found.append(source)
                    break
    return found if found else ["Unknown energy source"]


def extract_exposures(text: str) -> List[str]:
    """Extract exposure information from report text."""
    text_lower = text.lower()
    found = []
    for exposure, keywords in EXPOSURE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(exposure)
                break
    return found if found else ["Exposure not specified"]


def extract_consequences(text: str) -> List[str]:
    """Extract potential consequences from report text."""
    text_lower = text.lower()
    found = []
    for consequence, keywords in CONSEQUENCE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(consequence)
                break
    return found if found else ["Potential injury"]


# ── Control failure detection ──────────────────────────────────────────────
CONTROL_KEYWORD_MAP = {
    "Energy isolation": ["isolation", "lockout", "tagout", "LOTO", "de-energize", "de-energise", "zero energy"],
    "Gas testing": ["gas test", "gas testing", "atmosphere test", "atmospheric monitoring", "LEL", "H2S monitor"],
    "Permit to work": ["permit", "PTW", "work permit", "authorization"],
    "Barricading": ["barricade", "barricading", "barrier", "cordon", "exclusion zone"],
    "Guarding": ["guard", "guarding", "safety guard", "protective cover", "machine guard"],
    "PPE": ["PPE", "personal protective", "hard hat", "helmet", "gloves", "safety glasses", "respirator"],
    "Interlock": ["interlock", "safety interlock", "safety system", "interlocked"],
    "Emergency shutdown": ["emergency shutdown", "ESD", "emergency stop", "panic button"],
    "Fall protection": ["fall protection", "harness", "lanyard", "safety line", "guardrail", "anchor point"],
    "Exclusion zone": ["exclusion zone", "safety zone", "restricted area", "no-go zone"],
    "Procedure compliance": ["procedure", "SOP", "safe work procedure", "standard operating"],
    "Supervision": ["supervision", "supervisor", "oversight", "monitoring"],
    "Communication": ["communication", "radio", "hand signal", "briefing"],
    "Fire watch": ["fire watch", "fire standby", "fire extinguisher"],
    "Ventilation": ["ventilation", "ventilating", "exhaust fan", "fresh air"],
    "LOTO": ["LOTO", "lockout", "tagout", "lock-out", "tag-out"],
    "Fall arrest system": ["fall arrest", "arrest system", "lifeline"],
    "Rigging inspection": ["rigging", "sling", "shackle", "hook inspection"],
    "Crane certification": ["crane cert", "crane inspection", "load test"],
}


def detect_control_failures(text: str) -> List[Dict[str, str]]:
    """Detect control failures or missing controls."""
    text_lower = text.lower()
    failures = []

    failure_indicators = [
        "not", "no", "without", "failed", "missing", "bypassed",
        "disabled", "removed", "absent", "not performed", "not done",
        "not applied", "not verified", "not confirmed", "not completed",
        "neglected", "omitted", "skipped", "wasn't", "didn't",
        "not in place", "not available", "expired", "inadequate",
        "insufficient", "lacking", "deficient", "not followed"
    ]

    for control, keywords in CONTROL_KEYWORD_MAP.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                # Check for failure indicators nearby
                for indicator in failure_indicators:
                    # Look for indicator within 50 chars of keyword
                    kw_pos = text_lower.find(kw.lower())
                    if kw_pos >= 0:
                        window = text_lower[max(0, kw_pos - 50):kw_pos + len(kw) + 50]
                        if indicator in window:
                            status = "Failed" if indicator in ["failed", "bypassed", "disabled", "removed"] else "Missing"
                            failures.append({"control": control, "status": status})
                            break
                break

    # If negation detected around control keywords but no explicit failure found
    if not failures:
        for control, keywords in CONTROL_KEYWORD_MAP.items():
            for kw in keywords:
                if detect_negation(text, kw):
                    failures.append({"control": control, "status": "Not verified"})
                    break

    return failures if failures else [{"control": "Not determined", "status": "Unknown"}]


# ── IOGP classification ────────────────────────────────────────────────────
def classify_iogp_rules(text: str) -> List[Dict]:
    """Multi-label classification of IOGP Life-Saving Rules."""
    text_lower = text.lower()
    results = []

    for rule in IOGP_RULES:
        score = 0.0
        matched_keywords = []

        for kw in rule["keywords"]:
            kw_score = score_keyword_match(text, kw, weight=0.4)
            if kw_score > 0:
                score += kw_score
                matched_keywords.append(kw)

        for phrase in rule["example_phrases"]:
            if find_phrase_in_text(text, phrase):
                score += 0.5
                matched_keywords.append(phrase)

        # Boost score if multiple keywords match
        if len(matched_keywords) > 1:
            score = min(score * 1.2, 1.0)

        # Add small base probability for contextual matches
        score = min(score + 0.05, 1.0) if score > 0 else 0.02

        results.append({
            "rule": rule["name"],
            "probability": round(min(score, 0.99), 2)
        })

    # Sort by probability and filter low-confidence
    results = [r for r in results if r["probability"] > 0.10]
    results.sort(key=lambda x: x["probability"], reverse=True)

    return results[:5]  # Top 5 rules


# ── SIF scoring engine ─────────────────────────────────────────────────────
def compute_sif_score(text: str, iogp_rules: List[Dict], hazards: List[str],
                      energy_sources: List[str], exposures: List[str],
                      controls: List[Dict]) -> Tuple[float, float, str, str]:
    """
    Compute SIF probability, confidence, classification, and priority.
    Returns (sif_probability, confidence, classification, priority)
    """
    text_lower = text.lower()
    base_score = 0.10

    # High-risk pattern matching (flexible keyword proximity)
    high_risk_keywords = [
        # Worker + hazard combinations
        ('worker', 'energized', 0.18),
        ('worker', 'live electrical', 0.20),
        ('worker', 'suspended load', 0.18),
        ('worker', 'below load', 0.18),
        ('worker', 'pressure release', 0.16),
        ('worker', 'confined space', 0.14),
        ('worker', 'no gas test', 0.16),
        ('worker', 'hydrocarbon', 0.14),
        ('worker', 'hot work', 0.12),
        ('worker', 'standing', 0.08),
        # Unsafe act keywords
        ('without', 'isolation', 0.20),
        ('without', 'verifying', 0.18),
        ('without', 'gas testing', 0.18),
        ('without', 'permit', 0.14),
        ('not', 'confirmed', 0.12),
        ('not', 'verified', 0.14),
        ('failed', 'isolation', 0.18),
        ('bypassed', 'safety', 0.16),
        ('bypassed', 'interlock', 0.18),
        ('removed', 'guard', 0.14),
        ('disabled', 'alarm', 0.14),
        # Hazard keywords (amplify base risk)
        ('residual', 'pressure', 0.16),
        ('hydrocarbon', 'release', 0.18),
        ('unexpected', 'release', 0.14),
        ('uncontrolled', 'release', 0.16),
        ('arc flash', '', 0.16),
        ('oxygen', 'deficient', 0.14),
        ('explosion', '', 0.18),
        ('fire', '', 0.12),
        ('injury', 'occurred', 0.14),
        ('rescue', '', 0.12),
        ('struck by', '', 0.12),
        ('fall', 'height', 0.12),
        ('falling object', '', 0.14),
        ('overloaded', 'crane', 0.12),
        ('damaged', 'sling', 0.10),
        ('speeding', '', 0.08),
        ('fatigue', '', 0.08),
        ('seatbelt', '', 0.06),
        ('missing', 'fall protection', 0.14),
        ('no', 'gas test', 0.14),
        ('without', 'gas test', 0.14),
    ]

    for kw1, kw2, weight in high_risk_keywords:
        if kw1 in text_lower and (not kw2 or kw2 in text_lower):
            if not detect_negation(text, kw1):
                base_score += weight

    # Reduced score for safety measures present
    safety_indicators = ["confirmed", "verified", "proper", "correct", "safe",
                         "completed", "followed", "used", "worn", "in place",
                         "no injury", "near miss"]
    for indicator in safety_indicators:
        if indicator in text_lower:
            base_score -= 0.03

    # Boost based on failed controls
    failed_controls = [c for c in controls if c["status"] in ["Failed", "Missing", "Not verified"]]
    base_score += len(failed_controls) * 0.10

    # Boost based on top IOGP rule confidence
    if iogp_rules:
        max_rule_prob = max(r["probability"] for r in iogp_rules)
        base_score += max_rule_prob * 0.18

    # Boost for worker exposure
    worker_exposure_keywords = ["worker", "personnel", "employee", "contractor", "person", "staff"]
    for kw in worker_exposure_keywords:
        if kw in text_lower and not detect_negation(text, kw):
            base_score += 0.08
            break

    # Clamp
    sif_prob = max(0.05, min(0.99, base_score))

    # Confidence: based on how many signals we found
    signal_count = len([r for r in iogp_rules if r["probability"] > 0.3]) + len(hazards) + len(failed_controls)
    confidence = min(0.5 + signal_count * 0.08, 0.95)

    # Classification
    if sif_prob >= 0.85:
        classification = "Critical SIF Potential"
    elif sif_prob >= 0.65:
        classification = "High SIF Potential"
    elif sif_prob >= 0.40:
        classification = "Review Required"
    else:
        classification = "Lower SIF Potential"

    # Priority
    if sif_prob >= 0.85:
        priority = "Critical"
    elif sif_prob >= 0.65:
        priority = "High"
    elif sif_prob >= 0.40:
        priority = "Medium"
    else:
        priority = "Low"

    # Near-boundary uncertainty
    if abs(sif_prob - 0.85) < 0.05 or abs(sif_prob - 0.65) < 0.05 or abs(sif_prob - 0.40) < 0.05:
        confidence *= 0.85  # Reduce confidence near boundaries

    return round(sif_prob, 3), round(confidence, 3), classification, priority


# ── Evidence extraction ─────────────────────────────────────────────────────
def extract_evidence(text: str) -> List[str]:
    """Extract the strongest evidence phrases from the report."""
    sentences = re.split(r'[.!?]+', text)
    evidence = []
    evidence_keywords = [
        "without", "not", "failed", "missing", "bypassed", "residual",
        "hydrocarbon", "release", "energized", "pressure", "confined",
        "worker", "personnel", "exposure", "nearby", "suspended",
        "incident", "injury", "rescue", "emergency", "unexpected",
        "violation", "unsafe", "hazard", "risk", "danger"
    ]

    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 10:
            continue
        score = sum(1 for kw in evidence_keywords if kw in sentence.lower())
        if score >= 2:
            evidence.append(f'"{sentence.strip()}"')

    if not evidence:
        # Fall back to shorter snippets
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) >= 15 and any(kw in sentence.lower() for kw in evidence_keywords):
                evidence.append(f'"{sentence.strip()}"')

    return evidence[:6]


# ── Explanation generation ──────────────────────────────────────────────────
def generate_explanation(text: str, sif_prob: float, iogp_rules: List[Dict],
                         hazards: List[str], energy_sources: List[str],
                         exposures: List[str], controls: List[Dict],
                         evidence: List[str]) -> str:
    """Generate a natural language explanation of why the report was flagged."""
    parts = []

    if sif_prob >= 0.65:
        parts.append("The report was prioritized because it describes")
    elif sif_prob >= 0.40:
        parts.append("The report received a review recommendation due to")
    else:
        parts.append("The report was assessed as lower risk because")

    # Hazards
    if hazards and hazards != ["General hazard"]:
        parts.append(f"the presence of {', '.join(hazards[:3])} hazards")

    # Energy
    if energy_sources and energy_sources != ["Unknown energy source"]:
        parts.append(f"involving {', '.join(energy_sources[:2])} energy sources")

    # Exposure
    if exposures and exposures != ["Exposure not specified"]:
        parts.append(f"with {exposures[0].lower()}")

    # Failed controls
    active_failures = [c for c in controls if c["status"] in ["Failed", "Missing", "Not verified"]]
    if active_failures:
        controls_text = ", ".join(c["control"] for c in active_failures[:3])
        parts.append(f"and potential issues with {controls_text}")

    # IOGP rules
    top_rules = [r["rule"] for r in iogp_rules[:3] if r["probability"] > 0.3]
    if top_rules:
        parts.append(f"The report matches {', '.join(top_rules)} Life-Saving Rules")

    # No injury caveat
    text_lower = text.lower()
    if "no injury" in text_lower or "no harm" in text_lower:
        parts.append("Although no injury occurred")

    # Safety note
    if sif_prob >= 0.65:
        parts.append("This assessment is based on AI-assisted screening and must be validated by qualified HSE personnel.")
    else:
        parts.append("This is a lower-risk assessment but should still be reviewed by HSE personnel for completeness.")

    explanation = " ".join(parts)
    if not explanation or len(explanation) < 20:
        explanation = "The report was analyzed by the AI system. The classification is based on detected safety signals, keywords, and patterns in the text. This is an AI-assisted screening result and must be reviewed by qualified HSE personnel."

    return explanation


# ── Main analysis function ──────────────────────────────────────────────────
def analyze_report(text: str) -> Dict:
    """
    Main entry point for AI analysis.
    Takes raw report text and returns a comprehensive analysis.
    """
    # Extract components
    hazards = extract_hazards(text)
    energy_sources = extract_energy_sources(text)
    exposures = extract_exposures(text)
    consequences = extract_consequences(text)
    controls = detect_control_failures(text)
    iogp_rules = classify_iogp_rules(text)
    evidence = extract_evidence(text)

    # Compute SIF score
    sif_prob, confidence, classification, priority = compute_sif_score(
        text, iogp_rules, hazards, energy_sources, exposures, controls
    )

    # Generate explanation
    explanation = generate_explanation(
        text, sif_prob, iogp_rules, hazards, energy_sources,
        exposures, controls, evidence
    )

    return {
        "sif_probability": sif_prob,
        "sif_classification": classification,
        "confidence": confidence,
        "priority": priority,
        "iogp_rules": iogp_rules,
        "hazards": hazards,
        "energy_sources": energy_sources,
        "exposures": exposures,
        "potential_consequences": consequences,
        "failed_controls": controls,
        "evidence": evidence,
        "explanation": explanation
    }

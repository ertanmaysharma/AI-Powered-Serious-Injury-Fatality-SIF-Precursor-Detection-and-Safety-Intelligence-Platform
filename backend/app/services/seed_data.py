import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.database import Report, Prediction, IOGPPrediction, ExtractedHazard, ControlStatus
from app.services.ai_engine import analyze_report


SYNTHETIC_REPORTS = [
    # Energy Isolation
    {
        "report_id": "SYN-001",
        "date": "2025-01-15",
        "location": "Asset A - Processing Plant",
        "asset": "Crude Oil Processing",
        "department": "Maintenance",
        "activity": "Pump maintenance",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "During maintenance of a high-pressure hydrocarbon pump, the contractor opened the flange before verifying zero-energy isolation. Residual pressure caused an unexpected gas release. The worker was standing approximately two meters from the release point. No injury occurred."
    },
    {
        "report_id": "SYN-002",
        "date": "2025-01-18",
        "location": "Asset B - Electrical Substation",
        "asset": "Power Distribution",
        "department": "Electrical",
        "activity": "Electrical maintenance",
        "report_type": "Unsafe Act",
        "reporter_type": "Supervisor",
        "raw_text": "An electrician was working on a 11kV switchgear without confirming LOTO procedures. The line was still energized when the worker attempted to remove a breaker. A brief arc flash occurred. The worker was wearing appropriate PPE and no injury was sustained."
    },
    {
        "report_id": "SYN-003",
        "date": "2025-02-01",
        "location": "Asset A - Compressor Station",
        "asset": "Gas Compression",
        "department": "Operations",
        "activity": "Valve maintenance",
        "report_type": "Unsafe Condition",
        "reporter_type": "Employee",
        "raw_text": "The isolation valve on the gas compressor suction line was found partially open during maintenance. LOTO tags were in place but the valve had not been properly closed. Residual gas pressure was present in the line."
    },
    {
        "report_id": "SYN-004",
        "date": "2025-02-10",
        "location": "Asset C - Well Pad",
        "asset": "Wellhead Operations",
        "department": "Drilling",
        "activity": "Wellhead maintenance",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "A maintenance technician opened a flange connection on the wellhead piping without performing gas testing. Hydrocarbon vapors were detected in the area. The worker had bypassed the gas testing requirement."
    },
    {
        "report_id": "SYN-005",
        "date": "2025-02-20",
        "location": "Asset A - Tank Farm",
        "asset": "Storage Tanks",
        "department": "Operations",
        "activity": "Pump maintenance",
        "report_type": "Near Miss",
        "reporter_type": "Employee",
        "raw_text": "During pump maintenance, a maintenance worker removed the discharge valve without verifying zero energy. A small amount of crude oil leaked from the line. The worker stepped back quickly and was not exposed."
    },

    # Confined Space
    {
        "report_id": "SYN-006",
        "date": "2025-01-20",
        "location": "Asset A - Separator Unit",
        "asset": "Oil Separation",
        "department": "Maintenance",
        "activity": "Vessel entry",
        "report_type": "Unsafe Act",
        "reporter_type": "HSE Officer",
        "raw_text": "Two workers entered a separator vessel for internal inspection without gas testing. The atmospheric monitoring was not performed. Oxygen levels inside were found to be 18.2%, below the safe minimum of 19.5%. The workers were removed from the space."
    },
    {
        "report_id": "SYN-007",
        "date": "2025-02-05",
        "location": "Asset B - Water Treatment",
        "asset": "Water Treatment",
        "department": "Operations",
        "activity": "Tank cleaning",
        "report_type": "Unsafe Condition",
        "reporter_type": "Supervisor",
        "raw_text": "A worker was found inside a water storage tank without a confined space entry permit. No ventilation was in place and no gas testing had been performed. The supervisor intervened and the worker was removed."
    },
    {
        "report_id": "SYN-008",
        "date": "2025-02-15",
        "location": "Asset A - Pipeline",
        "asset": "Pipeline Systems",
        "department": "Maintenance",
        "activity": "Pipe inspection",
        "report_type": "Near Miss",
        "reporter_type": "Employee",
        "raw_text": "During inspection of a pipeline segment, a technician entered a pipe section that required confined space entry authorization. No atmosphere monitoring was conducted. The area was found to have low oxygen levels."
    },

    # Hot Work
    {
        "report_id": "SYN-009",
        "date": "2025-01-25",
        "location": "Asset C - Fabrication Yard",
        "asset": "Fabrication",
        "department": "Construction",
        "activity": "Welding",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "A welder performed hot work on a pipe near a hydrocarbon processing area without a valid hot work permit. Gas testing was not performed before work started. Sparks were observed falling towards a drain area."
    },
    {
        "report_id": "SYN-010",
        "date": "2025-02-08",
        "location": "Asset A - Processing Plant",
        "asset": "Processing Unit",
        "department": "Maintenance",
        "activity": "Cutting operations",
        "report_type": "Unsafe Act",
        "reporter_type": "HSE Officer",
        "raw_text": "A maintenance worker was cutting metal near a combustible material storage area. No hot work permit was obtained and no fire watch was in place. The cutting torch was producing sparks within 5 meters of combustible drums."
    },

    # Line of Fire
    {
        "report_id": "SYN-011",
        "date": "2025-01-22",
        "location": "Asset A - Loading Terminal",
        "asset": "Loading Operations",
        "department": "Operations",
        "activity": "Crane operations",
        "report_type": "Near Miss",
        "reporter_type": "Employee",
        "raw_text": "A worker was walking beneath a suspended load being lifted by a mobile crane. The load was a 2-tonne pipe section being moved across the loading area. No exclusion zone had been established and no banksmen were directing the lift."
    },
    {
        "report_id": "SYN-012",
        "date": "2025-02-12",
        "location": "Asset B - Road Network",
        "asset": "Site Roads",
        "department": "Logistics",
        "activity": "Vehicle movement",
        "report_type": "Near Miss",
        "reporter_type": "Employee",
        "raw_text": "A heavy truck was reversing near a group of workers without a spotter. The reversing alarm was not audible. Workers were in the direct path of the vehicle. No verbal warning was given."
    },
    {
        "report_id": "SYN-013",
        "date": "2025-02-18",
        "location": "Asset A - Pipe Rack",
        "asset": "Piping Systems",
        "department": "Operations",
        "activity": "Pressure testing",
        "report_type": "Unsafe Condition",
        "reporter_type": "Supervisor",
        "raw_text": "During hydrostatic testing of a new pipeline, a pressure release occurred through a flanged connection. Two workers were standing in the line of fire. No exclusion zone was established around the test area."
    },

    # Working at Height
    {
        "report_id": "SYN-014",
        "date": "2025-01-28",
        "location": "Asset A - Tower Unit",
        "asset": "Distillation Column",
        "department": "Maintenance",
        "activity": "Scaffold work",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "A maintenance worker was working on scaffolding at 15 meters height without wearing a fall arrest harness. The scaffold guardrails were partially removed. No fall protection was in use."
    },
    {
        "report_id": "SYN-015",
        "date": "2025-02-03",
        "location": "Asset C - Tank Roof",
        "asset": "Storage Tank",
        "department": "Construction",
        "activity": "Tank roof repair",
        "report_type": "Unsafe Condition",
        "reporter_type": "HSE Officer",
        "raw_text": "Workers on a tank roof were using a ladder that was not properly secured. The ladder extended only 1 meter above the landing platform. No fall protection system was in place and workers were exposed to a fall hazard."
    },

    # Safe Mechanical Lifting
    {
        "report_id": "SYN-016",
        "date": "2025-01-30",
        "location": "Asset A - Heavy Maintenance",
        "asset": "Heavy Equipment",
        "department": "Maintenance",
        "activity": "Crane lift",
        "report_type": "Unsafe Condition",
        "reporter_type": "Supervisor",
        "raw_text": "A mobile crane was used to lift a 12-tonne heat exchanger bundle. The crane was rated for 10 tonnes at the required radius. The load was overweight for the crane capacity. The lift was stopped before any incident occurred."
    },
    {
        "report_id": "SYN-017",
        "date": "2025-02-14",
        "location": "Asset B - Pipe Rack",
        "asset": "Piping Systems",
        "department": "Construction",
        "activity": "Pipe spool installation",
        "report_type": "Unsafe Condition",
        "reporter_type": "Employee",
        "raw_text": "A damaged lifting sling was used to lift a heavy pipe spool. The sling showed visible wear and frayed edges. Workers were standing below the suspended load during the lift. The sling was rated for the load but was compromised."
    },

    # Driving
    {
        "report_id": "SYN-018",
        "date": "2025-01-19",
        "location": "Asset A - Access Road",
        "asset": "Road Network",
        "department": "Logistics",
        "activity": "Vehicle transport",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "A company vehicle was observed traveling at approximately 80 km/h in a 50 km/h zone on the site access road. The driver was not wearing a seatbelt and was using a mobile phone while driving."
    },
    {
        "report_id": "SYN-019",
        "date": "2025-02-09",
        "location": "Asset B - Construction Area",
        "asset": "Construction Site",
        "department": "Logistics",
        "activity": "Material transport",
        "report_type": "Near Miss",
        "reporter_type": "Supervisor",
        "raw_text": "A delivery truck reversed into a temporary barrier near a work area. The driver appeared fatigued and had been driving for 12 hours. No spotter was present during the reversing maneuver. Workers nearby were alerted by the horn."
    },
    {
        "report_id": "SYN-020",
        "date": "2025-02-22",
        "location": "Asset C - Inter-site Road",
        "asset": "Road Network",
        "department": "Logistics",
        "activity": "Shift change transport",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "A bus transporting workers to the site was observed driving with a tire blowout. The driver continued driving for approximately 2 km before stopping. Passengers were not wearing seatbelts. No injuries occurred."
    },

    # Work Authorisation
    {
        "report_id": "SYN-021",
        "date": "2025-01-26",
        "location": "Asset A - Processing Unit",
        "asset": "Processing",
        "department": "Maintenance",
        "activity": "Valve replacement",
        "report_type": "Unsafe Act",
        "reporter_type": "HSE Officer",
        "raw_text": "A maintenance crew started valve replacement work without obtaining a valid work permit. The permit to work had expired the previous day. Work was in progress for approximately 30 minutes before the HSE officer noticed."
    },
    {
        "report_id": "SYN-022",
        "date": "2025-02-11",
        "location": "Asset B - Electrical Room",
        "asset": "Electrical Systems",
        "department": "Electrical",
        "activity": "Cable pulling",
        "report_type": "Unsafe Act",
        "reporter_type": "Supervisor",
        "raw_text": "Electrical work was initiated before the required safety briefing was conducted. The toolbox talk was scheduled for after work commenced. Workers had already begun cable pulling activities without understanding the specific hazards."
    },

    # Bypassing Safety Controls
    {
        "report_id": "SYN-023",
        "date": "2025-02-06",
        "location": "Asset A - Compressor Station",
        "asset": "Gas Compression",
        "department": "Operations",
        "activity": "Equipment startup",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "An operator bypassed the safety interlock on the gas compressor vibration alarm to prevent automatic shutdown during startup. The interlock was defeated for approximately 2 hours. Vibration levels exceeded the alarm threshold during this period."
    },
    {
        "report_id": "SYN-024",
        "date": "2025-02-16",
        "location": "Asset C - Process Unit",
        "asset": "Process Control",
        "department": "Operations",
        "activity": "Safety system maintenance",
        "report_type": "Unsafe Act",
        "reporter_type": "HSE Officer",
        "raw_text": "A safety guard was removed from a rotating equipment coupling during maintenance. The guard was not replaced before the equipment was restarted. The rotating shaft was exposed for approximately one hour before the issue was identified."
    },
    {
        "report_id": "SYN-025",
        "date": "2025-02-25",
        "location": "Asset A - Metering Station",
        "asset": "Flow Measurement",
        "department": "Operations",
        "activity": "Instrument calibration",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "The high-level alarm on a hydrocarbon storage tank was disabled to prevent nuisance alarms during a calibration exercise. The alarm remained disabled for 4 hours. The tank level was being monitored manually."
    },

    # Low-risk reports
    {
        "report_id": "SYN-026",
        "date": "2025-01-17",
        "location": "Asset A - Office Area",
        "asset": "Office Building",
        "department": "Administration",
        "activity": "Housekeeping",
        "report_type": "Unsafe Condition",
        "reporter_type": "Employee",
        "raw_text": "A spill of water from an air conditioning unit was observed in the office corridor. The area was not barricaded and no warning signs were placed. A slip hazard existed."
    },
    {
        "report_id": "SYN-027",
        "date": "2025-02-02",
        "location": "Asset B - Warehouse",
        "asset": "Material Storage",
        "department": "Logistics",
        "activity": "Material handling",
        "report_type": "Unsafe Condition",
        "reporter_type": "Employee",
        "raw_text": "Several boxes were stacked unevenly on a storage rack in the warehouse. The stack was leaning slightly. No items had fallen but the arrangement was unstable and could collapse."
    },
    {
        "report_id": "SYN-028",
        "date": "2025-02-13",
        "location": "Asset A - Workshop",
        "asset": "Maintenance Workshop",
        "department": "Maintenance",
        "activity": "Tool storage",
        "report_type": "Unsafe Condition",
        "reporter_type": "Employee",
        "raw_text": "Hand tools were left scattered on the workshop floor after a repair job. Several sharp tools were lying near a walkway. The housekeeping standard was not maintained."
    },
    {
        "report_id": "SYN-029",
        "date": "2025-02-19",
        "location": "Asset C - Camp Area",
        "asset": "Worker Accommodation",
        "department": "Administration",
        "activity": "Camp maintenance",
        "report_type": "Unsafe Condition",
        "reporter_type": "Employee",
        "raw_text": "A fire extinguisher in the worker accommodation building was found to be expired. The inspection tag showed it was last checked 18 months ago. The extinguisher was replaced immediately."
    },
    {
        "report_id": "SYN-030",
        "date": "2025-02-24",
        "location": "Asset A - Pipe Rack",
        "asset": "Piping Systems",
        "department": "Operations",
        "activity": "Routine inspection",
        "report_type": "Near Miss",
        "reporter_type": "Employee",
        "raw_text": "During a routine pipe rack inspection, a minor leak was identified at a flanged connection. The leak was small and contained. The area was isolated and the repair was completed within 2 hours."
    },

    # Additional high-risk scenarios
    {
        "report_id": "SYN-031",
        "date": "2025-03-01",
        "location": "Asset A - Flare System",
        "asset": "Flare Systems",
        "department": "Operations",
        "activity": "Flare tip replacement",
        "report_type": "Unsafe Act",
        "reporter_type": "HSE Officer",
        "raw_text": "During flare tip replacement, welding operations were conducted without confirming that the flare system was fully purged. Hydrocarbon residue was present in the flare header. An unexpected ignition occurred during welding. The welder sustained minor burns to the arm."
    },
    {
        "report_id": "SYN-032",
        "date": "2025-03-05",
        "location": "Asset B - Pig Launcher",
        "asset": "Pipeline Systems",
        "department": "Operations",
        "activity": "Pig launching",
        "report_type": "Unsafe Condition",
        "reporter_type": "Supervisor",
        "raw_text": "The pig launcher door was opened without verifying pressure isolation. Residual pressure of approximately 5 bar was present in the launcher barrel. The door was partially opened and a high-pressure gas release occurred. Workers in the area evacuated. No injuries were reported."
    },
    {
        "report_id": "SYN-033",
        "date": "2025-03-10",
        "location": "Asset A - Separator",
        "asset": "Oil Separation",
        "department": "Maintenance",
        "activity": "Internal inspection",
        "report_type": "Unsafe Act",
        "reporter_type": "Employee",
        "raw_text": "An inspector entered a production separator vessel to perform internal inspection. The vessel had not been properly isolated and gas tested. Hydrocarbon vapor was detected inside the vessel. The inspector was removed via the manhole."
    },
    {
        "report_id": "SYN-034",
        "date": "2025-03-15",
        "location": "Asset C - Cooling Tower",
        "asset": "Cooling Systems",
        "department": "Operations",
        "activity": "Fan maintenance",
        "report_type": "Near Miss",
        "reporter_type": "Employee",
        "raw_text": "A maintenance worker was performing repair work on a cooling tower fan while another worker started the fan from the control room. The rotating blades narrowly missed the maintenance worker. The energy isolation procedure was not followed."
    },
    {
        "report_id": "SYN-035",
        "date": "2025-03-20",
        "location": "Asset A - Manifold",
        "asset": "Wellhead Manifold",
        "department": "Drilling",
        "activity": "Well testing",
        "report_type": "Unsafe Act",
        "reporter_type": "HSE Officer",
        "raw_text": "During well testing operations, a pressure gauge showed readings above the design limit. The operator did not report the overpressure condition and did not activate the emergency shutdown. The wellhead was exposed to pressures exceeding safe operating limits for approximately 15 minutes."
    },
]


def seed_database(db: Session):
    """Seed the database with synthetic reports and run AI analysis on each."""
    existing = db.query(Report).count()
    if existing >= len(SYNTHETIC_REPORTS):
        return False

    for i, report_data in enumerate(SYNTHETIC_REPORTS):
        existing_report = db.query(Report).filter(Report.report_id == report_data["report_id"]).first()
        if existing_report:
            continue

        report = Report(
            report_id=report_data["report_id"],
            date=report_data["date"],
            location=report_data["location"],
            asset=report_data["asset"],
            department=report_data["department"],
            activity=report_data["activity"],
            report_type=report_data["report_type"],
            reporter_type=report_data["reporter_type"],
            raw_text=report_data["raw_text"],
            is_synthetic=1,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
        )
        db.add(report)
        db.flush()

        # Run AI analysis
        analysis = analyze_report(report_data["raw_text"])

        prediction = Prediction(
            report_id=report_data["report_id"],
            sif_probability=analysis["sif_probability"],
            classification=analysis["sif_classification"],
            confidence=analysis["confidence"],
            priority=analysis["priority"],
            model_version="demo-v1.0",
            evidence=analysis["evidence"],
            explanation=analysis["explanation"],
            created_at=report.created_at
        )
        db.add(prediction)

        for rule in analysis["iogp_rules"]:
            iogp_pred = IOGPPrediction(
                report_id=report_data["report_id"],
                rule=rule["rule"],
                probability=rule["probability"]
            )
            db.add(iogp_pred)

        for h in analysis["hazards"]:
            for es in analysis["energy_sources"][:1]:
                for exp in analysis["exposures"][:1]:
                    for pc in analysis["potential_consequences"][:1]:
                        hazard_entry = ExtractedHazard(
                            report_id=report_data["report_id"],
                            hazard=h,
                            energy_source=es,
                            exposure=exp,
                            potential_consequence=pc
                        )
                        db.add(hazard_entry)

        for control in analysis["failed_controls"]:
            control_entry = ControlStatus(
                report_id=report_data["report_id"],
                control=control["control"],
                status=control["status"]
            )
            db.add(control_entry)

    db.commit()
    return True

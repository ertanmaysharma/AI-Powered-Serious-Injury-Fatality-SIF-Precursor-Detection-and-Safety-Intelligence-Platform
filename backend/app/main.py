import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.routing import Mount

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import init_db, SessionLocal
from app.models.database import User
from app.services.auth import hash_password
from app.services.seed_data import seed_database

from app.api.auth import router as auth_router
from app.api.reports import router as reports_router
from app.api.analytics import router as analytics_router
from app.api.knowledge import router as knowledge_router

# ── Paths ──────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent.parent          # backend/
PROJECT_ROOT = BACKEND_DIR.parent                             # SIF-GUARD/
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

app = FastAPI(
    title="SIF-GUARD API",
    description="AI-Powered Serious Injury & Fatality Precursor Detection and Safety Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes (registered FIRST so they take precedence) ─────────────────
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(reports_router, prefix="/api", tags=["Reports"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(knowledge_router, prefix="/api", tags=["Knowledge"])


# ── Static assets from the Vite build ─────────────────────────────────────
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")


# ── SPA catch-all: serve React index.html for all non-API routes ───────────
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(request: Request, full_path: str):
    """Serve the React SPA for all non-API, non-static-file routes.
    API routes (/api/*) and docs (/docs, /redoc, /openapi.json) are
    handled by FastAPI before this catch-all is reached.
    """
    index_html = FRONTEND_DIST / "index.html"
    if index_html.exists():
        return FileResponse(str(index_html))
    return {"message": "SIF-GUARD API", "docs": "/docs"}


# ── Lazy startup helper ───────────────────────────────────────────────────
_startup_done = False


def _ensure_startup():
    """Run startup logic once. Used as fallback for Vercel serverless
    where the 'startup' event may not fire."""
    global _startup_done
    if _startup_done:
        return
    _startup_done = True
    try:
        init_db()
        db = SessionLocal()
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            admin = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                role="admin",
                full_name="System Administrator",
            )
            db.add(admin)
            analyst = User(
                username="analyst",
                hashed_password=hash_password("analyst123"),
                role="hse_analyst",
                full_name="HSE Analyst",
            )
            db.add(analyst)
            db.commit()
        seed_database(db)
        db.close()
    except Exception as e:
        import logging
        logging.warning(f"Startup initialization failed: {e}")


# ── Startup: DB + seed data ───────────────────────────────────────────────
@app.on_event("startup")
def startup():
    _ensure_startup()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

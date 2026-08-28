"""
Vercel Serverless Entry Point for SIF-GUARD API

This file is the entry point for Vercel's Python runtime.
It imports the existing FastAPI application from the backend
and handles Vercel-specific setup.
"""

import os
import sys
from pathlib import Path

# Ensure the backend directory is on the Python path
# Vercel runs from the project root, so we need to add backend/
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import the existing FastAPI app
from app.main import app, _ensure_startup  # noqa: E402

# Ensure the database is initialized and seeded on first request
# (Vercel serverless may not fire the startup event)
_ensure_startup()

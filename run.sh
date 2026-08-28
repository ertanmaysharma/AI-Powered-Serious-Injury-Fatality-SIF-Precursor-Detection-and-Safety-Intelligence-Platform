#!/usr/bin/env bash
set -e

# ── Resolve project root ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
DIST_DIR="$FRONTEND_DIR/dist"

# ── Banner ────────────────────────────────────────────────────────────────
echo ""
echo "🚀 Starting SIF-GUARD..."
echo ""

# ── Step 1: Build frontend if dist/ does not exist ────────────────────────
if [ -d "$DIST_DIR" ] && [ -f "$DIST_DIR/index.html" ]; then
    echo "📦 Frontend build ready"
else
    echo "📦 Building frontend..."
    cd "$FRONTEND_DIR"
    npm install --silent 2>/dev/null || npm install
    npm run build
    cd "$SCRIPT_DIR"
    echo "✅ Frontend build complete"
fi

echo ""

# ── Step 2: Ensure backend venv + deps ───────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    pip install -r "$BACKEND_DIR/requirements.txt"
else
    source "$VENV_DIR/bin/activate"
fi

# ── Step 3: Start FastAPI ─────────────────────────────────────────────────
echo "🐍 Starting FastAPI..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SIF-GUARD is running"
echo " http://localhost:8000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$BACKEND_DIR"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

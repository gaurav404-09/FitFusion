#!/bin/bash
set -e

echo "=== CampusTitan Startup ==="
echo "Working directory: $(pwd)"
echo "Python: $(python --version 2>&1)"

# Load backend env if present (Render uses env vars directly, this helps locally)
if [ -f "backend/.env" ]; then
    echo "Loading backend/.env ..."
    set -a && source backend/.env && set +a
fi
if [ -f ".env" ]; then
    echo "Loading .env ..."
    set -a && source .env && set +a
fi

echo "SUPABASE_URL present: ${SUPABASE_URL:+yes}${SUPABASE_URL:-no}"
echo "EXPO_PUBLIC_SUPABASE_URL present: ${EXPO_PUBLIC_SUPABASE_URL:+yes}${EXPO_PUBLIC_SUPABASE_URL:-no}"

# Start the single unified server (agent is embedded in nutrition_server.py)
echo "Starting unified server on PORT=${PORT:-5001} ..."
python backend/nutrition_server.py

#!/bin/bash
set -e

echo "=== CampusTitan Startup ==="
echo "Working directory: $(pwd)"
echo "Python: $(python --version 2>&1)"

# Load backend env if present so the agent API can read SUPABASE_URL etc.
if [ -f "backend/.env" ]; then
    echo "Loading backend/.env ..."
    set -a
    source backend/.env
    set +a
fi
# Also load root .env if present
if [ -f ".env" ]; then
    echo "Loading .env ..."
    set -a
    source .env
    set +a
fi

echo "SUPABASE_URL present: ${SUPABASE_URL:+yes}"
echo "EXPO_PUBLIC_SUPABASE_URL present: ${EXPO_PUBLIC_SUPABASE_URL:+yes}"
echo "COHERE_API_KEY present: ${COHERE_API_KEY:+yes}"
echo "EXPO_PUBLIC_COHERE_API_KEY present: ${EXPO_PUBLIC_COHERE_API_KEY:+yes}"

# Start the Python Agent API on port 5002 in the background
echo "Starting Agent API on port 5002 ..."
PORT=5002 python agent/api.py >> /tmp/agent_api.log 2>&1 &
AGENT_PID=$!
echo "Agent PID: $AGENT_PID"

# Give the agent a moment to start before the main server starts
sleep 3
echo "Agent log so far:"
cat /tmp/agent_api.log || true

# Start the Nutrition Server in the foreground on the Render-assigned PORT
echo "Starting Nutrition Server on PORT=${PORT:-5001} ..."
python backend/nutrition_server.py

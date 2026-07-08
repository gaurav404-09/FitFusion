#!/bin/bash
PORT=5002 python agent/api.py &

# Start the Nutrition Server (Port 5001 / Render Port) in the foreground
# Render automatically sets the PORT environment variable, which Flask will listen on
python backend/nutrition_server.py

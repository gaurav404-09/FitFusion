"""
Flask API for CampusTitan Agent
Serves as the bridge between Mobile App and Python LangGraph Agent
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import re
from datetime import datetime
from dotenv import load_dotenv

_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _repo_root)
sys.path.insert(0, os.path.join(_repo_root, "backend"))

# Load .env from backend folder (source of SUPABASE_URL/SUPABASE_ANON_KEY/GEMINI_API_KEY)
_backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
load_dotenv(_backend_env)

from langgraph_agent import CampusTitanAgent, handle_agent_request
from ai.router_agent import process_user_prompt

app = Flask(__name__)
CORS(app)

agent = None

def get_agent():
    global agent
    if agent is None:
        agent = CampusTitanAgent()
    return agent

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "CampusTitan Agent API"})

@app.route('/agent/query', methods=['POST'])
def process_query():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        query = data.get("query")
        user_id = data.get("user_id")
        user_context = data.get("user_context", {})
        
        if not query or not user_id:
            return jsonify({"success": False, "error": "Query and user_id required"}), 400
        
        result = handle_agent_request(query, user_id, user_context)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e), "where": "agent/query"}), 500

@app.route('/agent/quick', methods=['GET'])
def quick_stats():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"success": False, "error": "User ID required"}), 400
        
        agent_instance = get_agent()
        
        nutrition = agent_instance.tools["nutrition"].execute({"user_id": user_id, "protein_goal": 60}, user_id)
        activity = agent_instance.tools["activity"].execute({"user_id": user_id}, user_id)
        wellness = agent_instance.tools["wellness"].execute({"user_id": user_id}, user_id)
        
        return jsonify({
            "success": True,
            "data": {
                "protein": {"current": nutrition.data.get("totals", {}).get("protein", 0), "goal": 60},
                "activity": {"minutes": activity.data.get("totals", {}).get("total_minutes", 0), "calories": activity.data.get("totals", {}).get("total_calories", 0)},
                "sleep": {"hours": wellness.data.get("averages", {}).get("sleep_hours", 0)},
                "stress": {"level": wellness.data.get("averages", {}).get("stress_level", 5)}
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/agent/log', methods=['POST'])
def log_natural_language():
    """
    Natural Language Logging Endpoint
    
    User sends a message like:
    "I played badminton for 3 hours and had three chapatis in lunch"
    
    The system:
    1. Parses intent (activity + meal)
    2. Routes to appropriate tools
    3. Logs to Supabase
    4. Returns friendly response
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        query = data.get("query")
        user_id = data.get("user_id")
        date = data.get("date")  # Optional: YYYY-MM-DD format
        
        if not query or not user_id:
            return jsonify({"success": False, "error": "Query and user_id required"}), 400
        
        # Get Authorization header for RLS bypass or authentication
        auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
        user_jwt = None
        if auth_header:
            if auth_header.startswith('Bearer '):
                user_jwt = auth_header.split(' ')[1]
            else:
                user_jwt = auth_header
        
        # Process the logging query
        result = process_user_prompt(query=query, user_id=user_id, date=date, user_jwt=user_jwt)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e), "where": "agent/log"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f"Starting CampusTitan Agent API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)

import os
import json
import requests
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai import types

# ==========================================
# Phase 1: PostgreSQL Simulation
# ==========================================
def fetch_mock_postgres_data():
    """Simulates the JSON payload from your daily_logs database."""
    return [
        {"day": 1, "mental_score": 75, "nutrition_density": 65.2, "sleep_hours": 7.5},
        {"day": 2, "mental_score": 70, "nutrition_density": 60.1, "sleep_hours": 6.0},
        {"day": 3, "mental_score": 65, "nutrition_density": 62.0, "sleep_hours": 5.5},
        {"day": 4, "mental_score": 60, "nutrition_density": 58.5, "sleep_hours": 5.0},
        {"day": 5, "mental_score": 55, "nutrition_density": 64.0, "sleep_hours": 4.5},
        {"day": 6, "mental_score": 50, "nutrition_density": 61.2, "sleep_hours": 4.0},
        {"day": 7, "mental_score": 45, "nutrition_density": 65.0, "sleep_hours": 4.2}
    ]

# ==========================================
# Phase 2: Deterministic Math
# ==========================================
def calculate_moving_averages(history_data: list) -> dict:
    """Calculates strict mathematical averages to prevent LLM hallucination."""
    if not history_data:
        return {"avg_mental": 0, "avg_nutrition": 0, "avg_sleep": 0}
        
    days = len(history_data)
    avg_mental = sum(item["mental_score"] for item in history_data) / days
    avg_nutrition = sum(item["nutrition_density"] for item in history_data) / days
    avg_sleep = sum(item["sleep_hours"] for item in history_data) / days
    
    return {
        "avg_mental": round(avg_mental, 1),
        "avg_nutrition": round(avg_nutrition, 1),
        "avg_sleep": round(avg_sleep, 1)
    }

# ==========================================
# Phase 3: Gemini Context Compressor
# ==========================================
def compress_historical_context(history_data: list, api_key: str) -> str:
    """Uses a fast LLM to summarize 7 days of raw data into a 2-sentence trend."""
    genai.configure(api_key=api_key)
    raw_data_string = json.dumps(history_data, indent=2)
    
    prompt = f"""
    You are a clinical data summarizer. Analyze this 7-day chronological health log:
    {raw_data_string}
    
    Task: In exactly two sentences, state the objective trend in the user's mental health, nutrition, and sleep. 
    Identify any obvious correlations. Do NOT give advice. Do NOT be conversational.
    """
    
    print("-> Pinging Gemini for Context Compression...")
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            contents=prompt,
            generation_config=genai.GenerationConfig(temperature=0.1)
        )
        return response.text.strip()
    except Exception as e:
        print(f"Compression Error: {e}")
        return "Historical context unavailable due to API failure."

# ==========================================
# Phase 4: Final Payload Assembly
# ==========================================
def build_ollama_prompt(summary: str, averages: dict, current_meal: dict, current_mental: int) -> str:
    """Constructs the raw data string. (System tags are handled by the Modelfile)"""
    
    prompt = f"""[HISTORICAL CONTEXT - PAST 7 DAYS]
Trend: {summary}
7-Day Averages: 
- Mental Health: {averages['avg_mental']}/100
- Nutrition Density: {averages['avg_nutrition']}
- Sleep: {averages['avg_sleep']} hours

[TODAY'S CURRENT VECTORS]
- Current Mental Health Score: {current_mental}/100
- Just Ingested: {current_meal['dish_name']} ({current_meal['calories']} kcal, {current_meal['protein_g']}g Protein, {current_meal['fiber_g']}g Fiber)
- Today's Meal Nutrition Density: {current_meal['nutrition_density']}"""
    
    return prompt

# ==========================================
# Phase 5: Inference Server Connection
# ==========================================
def get_health_coach_advice(prompt_payload: str) -> str:
    """Sends the data to the local Ollama Llama 3 model."""
    print("-> Sending contextual payload to the local Titan Coach model...")
    
    url = "http://localhost:11434/api/generate"
    data = {
        "model": "titan-coach", # Must match the name you used in 'ollama create'
        "prompt": prompt_payload,
        "stream": False 
    }
    
    try:
        response = requests.post(url, json=data)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "Error: No response generated.")
    except requests.exceptions.RequestException as e:
        return f"CRITICAL: Failed to connect to local Ollama server. Is it running? Error: {e}"

# ==========================================
# Execution Block
# ==========================================
if __name__ == "__main__":
    # 1. Environment Setup
    load_dotenv()
    GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
    
    if not GEMINI_KEY:
        print("CRITICAL: GEMINI_API_KEY missing from .env file.")
        exit(1)

    # 2. Data Pipeline
    print("\n[Step 1] Fetching Mock PostgreSQL Data...")
    history_logs = fetch_mock_postgres_data()
    
    print("\n[Step 2] Calculating Moving Averages...")
    averages = calculate_moving_averages(history_logs)
    
    print("\n[Step 3] Running LLM Context Compression...")
    trend_summary = compress_historical_context(history_logs, GEMINI_KEY)
    
    print("\n[Step 4] Assembling Raw Prompt...")
    mock_todays_meal = {
        "dish_name": "2 rotis",
        "calories": 207.9,
        "protein_g": 7.84,
        "fiber_g": 3.43,
        "nutrition_density": 40.04
    }
    todays_mental_score = 42
    
    final_prompt = build_ollama_prompt(trend_summary, averages, mock_todays_meal, todays_mental_score)
    
    # 3. Model Inference
    print("\n[Step 5] Awaiting AI Coach Response...")
    final_advice = get_health_coach_advice(final_prompt)

    print("\n================ TITAN HEALTH COACH ================")
    print(final_advice)
    print("====================================================")
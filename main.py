# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from engine import EMATracker

app = FastAPI(title="Local Health Model API")
tracker = EMATracker(alpha=0.3)

# Define the data structure the UI team must send you
class DailyHealthData(BaseModel):
    user_id: str
    calories: int
    sleep_hours: float
    mood_score: int
    exercise_steps: int
    previous_ema: float | None = None # The DB team should provide this

# Define the structure you will return
class ModelResponse(BaseModel):
    daily_score: float
    new_ema: float
    llm_feedback: str

@app.post("/analyze", response_model=ModelResponse)
async def analyze_health(data: DailyHealthData):
    try:
        # 1. Calculate the pure mathematical scores
        daily_score = tracker.normalize_metrics(
            data.calories, data.sleep_hours, data.mood_score, data.exercise_steps
        )
        new_ema = tracker.calculate_new_ema(data.previous_ema, daily_score)

        # 2. Build the prompt with factual data
        system_prompt = f"""You are a direct, fact-based health coach. 
        The user's daily health score is {round(daily_score, 1)}/100.
        Their long-term health trend (EMA) is now {new_ema}/100.
        Their stats today: {data.calories} kcal, {data.sleep_hours} hrs sleep, {data.exercise_steps} steps, mood: {data.mood_score}/10.
        Provide a 2-sentence realistic assessment. Do not sugarcoat poor metrics."""

        # 3. Call your local model (Assuming Ollama running locally on port 11434)
        # Note: If Ollama isn't running, this will fail.
        llm_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3", # Or whatever local model you downloaded
                "prompt": system_prompt,
                "stream": False
            }
        )
        
        if llm_response.status_code == 200:
            llm_text = llm_response.json().get("response", "No response generated.")
        else:
            llm_text = "Error: Local LLM failed to respond."

        # 4. Return structured JSON to the UI/DB teams
        return ModelResponse(
            daily_score=round(daily_score, 2),
            new_ema=new_ema,
            llm_feedback=llm_text.strip()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
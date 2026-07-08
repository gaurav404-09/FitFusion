import os
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import cohere


class RouterAgent:
    def __init__(self):
        self.cohere_api_key = os.environ.get("COHERE_API_KEY")
        self._client = cohere.ClientV2(self.cohere_api_key) if self.cohere_api_key else None

    def extract_actions(self, query: str) -> Dict[str, Any]:
        prompt = f"""
You are an information extractor for a fitness tracking app.

User message: "{query}"

Extract every loggable action (foods and activities). Return ONLY JSON with this schema:
{{
  "is_logging_query": true/false,
  "actions": [
    {{
      "type": "food",
      "food_name": "banana shake",
      "quantity": 2,
      "meal_type": "breakfast"|"lunch"|"dinner"|"snack"|null,
      "nutrition": {{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}} 
    }},
    {{
      "type": "activity",
      "activity": "cricket",
      "duration_minutes": 240,
      "calories_burned": 0
    }}
  ]
}}

Rules:
- Return an empty actions list if nothing is loggable.
- quantity must be numeric (default 1).
- Convert hours to minutes.
- You may estimate calories/macros when unknown.
"""

        if self._client:
            try:
                resp = self._client.chat(
                    model="command-r-plus-08-2024",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=500,
                    temperature=0.1,
                )
                text = ""
                if getattr(resp, "text", None):
                    text = (resp.text or "").strip()
                elif getattr(resp, "message", None) and getattr(resp.message, "content", None):
                    blocks = resp.message.content or []
                    if isinstance(blocks, str):
                        text = blocks.strip()
                    else:
                        parts: List[str] = []
                        for b in blocks:
                            if isinstance(b, str):
                                parts.append(b)
                            elif getattr(b, "text", None):
                                parts.append(b.text)
                        text = "".join(parts).strip()
                parsed = json.loads(text or "")
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass

        # Deterministic fallback: minimal extraction for reliability
        q = (query or "").lower()
        is_logging = any(k in q for k in ["had", "ate", "eaten", "drank", "drink", "played", "did", "went", "logged", "track", "record"])
        actions: List[Dict[str, Any]] = []

        # Activity fallback
        act_match = re.search(r"(badminton|tennis|football|soccer|cricket|basketball|volleyball|swimming|running|walking|cycling|gym|workout|yoga)", q)
        if act_match:
            duration_minutes = 30
            hour_match = re.search(r"(\d+)\s*(?:hour|hours|hr|hrs)", q)
            min_match = re.search(r"(\d+)\s*(?:minute|minutes|mins|min)", q)
            if hour_match:
                duration_minutes = int(hour_match.group(1)) * 60
            elif min_match:
                duration_minutes = int(min_match.group(1))
            actions.append({"type": "activity", "activity": act_match.group(1), "duration_minutes": duration_minutes, "calories_burned": 0})

        # Food fallback: treat entire query as a single food action to be handled by NutritionTool fallback table
        if any(k in q for k in ["eat", "ate", "food", "meal", "breakfast", "lunch", "dinner", "snack", "drink", "drank", "juice", "shake"]):
            actions.append({"type": "food", "food_name": "", "quantity": 1, "meal_type": None, "nutrition": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}, "raw": query})

        return {"is_logging_query": is_logging, "actions": actions}


class ResponseGenerator:
    def generate(self, *, nutrition_result: Optional[Dict[str, Any]] = None, activity_result: Optional[Dict[str, Any]] = None) -> str:
        parts: List[str] = []

        if nutrition_result and nutrition_result.get("success"):
            meals = (nutrition_result.get("data") or {}).get("meals") or []
            for m in meals:
                parts.append(
                    f"You logged {m.get('quantity', 1)} {m.get('food_name', '')} for {m.get('meal_type', 'meal')} ("
                    f"{m.get('calories', 0)} calories, {m.get('protein', 0)}g protein)."
                )

        if activity_result and activity_result.get("success"):
            d = activity_result.get("data") or {}
            parts.append(
                f"You logged {d.get('duration_minutes', 0)} minutes of {d.get('activity', '')} (~{d.get('calories_burned', 0)} calories burned)."
            )

        if not parts:
            return "I couldn't detect anything to log. Try: 'I ate 2 eggs for breakfast' or 'I played badminton for 30 minutes'."

        parts.append("Your dashboard has been updated.")
        return " ".join(parts)


def process_user_prompt(*, query: str, user_id: str, date: Optional[str] = None, user_jwt: Optional[str] = None) -> Dict[str, Any]:
    from ai.tools.nutrition_tool import NutritionTool
    from ai.tools.activity_tool import ActivityTool

    router = RouterAgent()
    routing = router.extract_actions(query)

    if not routing.get("is_logging_query") or not (routing.get("actions") or []):
        return {"success": False, "answer": "This doesn't look like a logging request.", "data": {"routing": routing}}

    nutrition_tool = NutritionTool()
    activity_tool = ActivityTool()
    response_gen = ResponseGenerator()

    nutrition_results: List[Dict[str, Any]] = []
    activity_results: List[Dict[str, Any]] = []

    for action in (routing.get("actions") or []):
        if not isinstance(action, dict):
            continue
        if action.get("type") == "food":
            food_name = (action.get("food_name") or "").strip()
            quantity = action.get("quantity")
            meal_type = action.get("meal_type")
            nutrition = action.get("nutrition") or {}
            nutrition_results.append(
                nutrition_tool.execute_meals(
                    meals=[
                        {
                            "food_name": food_name,
                            "quantity": quantity,
                            "meal_type": meal_type,
                            "nutrition": nutrition,
                        }
                    ],
                    user_id=user_id,
                    date=date,
                    user_jwt=user_jwt,
                )
            )
        elif action.get("type") == "activity":
            activity_payload = {
                "type": action.get("activity") or action.get("type") or "",
                "duration_minutes": action.get("duration_minutes") or action.get("duration") or 0,
                "calories_burned": action.get("calories_burned") or 0,
            }
            activity_results.append(activity_tool.execute(activity=activity_payload, user_id=user_id, date=date, user_jwt=user_jwt))

    # For backward-compatible response generation, summarize first results
    nutrition_result = nutrition_results[0] if nutrition_results else None
    activity_result = activity_results[0] if activity_results else None
    answer = response_gen.generate(nutrition_result=nutrition_result, activity_result=activity_result)

    return {
        "success": True,
        "answer": answer,
        "data": {
            "nutrition": nutrition_results,
            "activity": activity_results,
            "routing": routing,
        },
    }

"""
Natural Language Logging Agent
=============================
This module adds natural language logging capabilities to CampusTitan.
It includes:
- Intent Parser: Extracts structured data from natural language
- Logging Router: LLM-based routing for logging queries
- Nutrition Logging Tool: Logs food intake with macro calculation
- Activity Logging Tool: Logs activities with calorie estimation
- Logging Response Generator: Creates friendly responses

Usage:
    from logging_agent import process_logging_query
    
    result = process_logging_query(
        query="I played badminton for 3 hours and had three chapatis in lunch",
        user_id="user-123"
    )
"""

import os
import json
import re
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
from cohere import ClientV2

load_dotenv()

# ==========================================
# Food Macro Lookup Table
# ==========================================

FOOD_MACRO_TABLE = {
    # Indian Foods
    "chapati": {"calories": 120, "protein": 3, "carbs": 20, "fat": 3},
    "roti": {"calories": 120, "protein": 3, "carbs": 20, "fat": 3},
    "paratha": {"calories": 250, "protein": 6, "carbs": 30, "fat": 12},
    "naan": {"calories": 260, "protein": 8, "carbs": 45, "fat": 6},
    "puri": {"calories": 160, "protein": 4, "carbs": 22, "fat": 7},
    "rice": {"calories": 130, "protein": 2, "carbs": 28, "fat": 0.3},
    "dal": {"calories": 120, "protein": 9, "carbs": 20, "fat": 3},
    "dal tadka": {"calories": 180, "protein": 12, "carbs": 22, "fat": 6},
    "rajma": {"calories": 220, "protein": 15, "carbs": 38, "fat": 4},
    "chole": {"calories": 210, "protein": 12, "carbs": 35, "fat": 5},
    "paneer": {"calories": 265, "protein": 14, "carbs": 3, "fat": 22},
    "butter chicken": {"calories": 350, "protein": 25, "carbs": 10, "fat": 25},
    "biryani": {"calories": 320, "protein": 12, "carbs": 45, "fat": 10},
    "dosa": {"calories": 200, "protein": 4, "carbs": 35, "fat": 5},
    "idli": {"calories": 100, "protein": 3, "carbs": 20, "fat": 1},
    "vada": {"calories": 150, "protein": 4, "carbs": 18, "fat": 7},
    "samosa": {"calories": 260, "protein": 5, "carbs": 30, "fat": 14},
    "pakora": {"calories": 200, "protein": 4, "carbs": 20, "fat": 12},
    "poha": {"calories": 180, "protein": 4, "carbs": 30, "fat": 5},
    "upma": {"calories": 160, "protein": 4, "carbs": 25, "fat": 5},
    
    # Common Foods
"egg": {"calories": 70, "protein": 6, "carbs": 0.6, "fat": 5},
    "eggs": {"calories": 70, "protein": 6, "carbs": 0.6, "fat": 5},
    "boiled egg": {"calories": 78, "protein": 6, "carbs": 0.6, "fat": 5},
    "fried egg": {"calories": 90, "protein": 6, "carbs": 0.6, "fat": 7},
    "omelette": {"calories": 120, "protein": 8, "carbs": 1, "fat": 9},
    "banana": {"calories": 89, "protein": 1, "carbs": 23, "fat": 0.3},
    "apple": {"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2},
    "orange": {"calories": 47, "protein": 0.9, "carbs": 12, "fat": 0.1},
    "mango": {"calories": 60, "protein": 0.8, "carbs": 15, "fat": 0.4},
    "grapes": {"calories": 69, "protein": 0.7, "carbs": 18, "fat": 0.2},
    "watermelon": {"calories": 30, "protein": 0.6, "carbs": 8, "fat": 0.2},
    "papaya": {"calories": 43, "protein": 0.5, "carbs": 11, "fat": 0.3},
    "milkshake": {"calories": 180, "protein": 6, "carbs": 30, "fat": 4},
    "milk": {"calories": 42, "protein": 3.4, "carbs": 5, "fat": 1},
    "curd": {"calories": 60, "protein": 4, "carbs": 5, "fat": 3},
    "yogurt": {"calories": 60, "protein": 4, "carbs": 5, "fat": 3},
    "butter": {"calories": 102, "protein": 0.1, "carbs": 0, "fat": 12},
    "cheese": {"calories": 113, "protein": 7, "carbs": 0.4, "fat": 9},
    "bread": {"calories": 80, "protein": 3, "carbs": 15, "fat": 1},
    "toast": {"calories": 100, "protein": 4, "carbs": 18, "fat": 2},
    "sandwich": {"calories": 250, "protein": 10, "carbs": 35, "fat": 8},
    "pizza": {"calories": 285, "protein": 12, "carbs": 36, "fat": 10},
    "burger": {"calories": 354, "protein": 17, "carbs": 31, "fat": 17},
    "fries": {"calories": 312, "protein": 3, "carbs": 41, "fat": 15},
    "noodles": {"calories": 138, "protein": 4, "carbs": 25, "fat": 2},
    "pasta": {"calories": 131, "protein": 5, "carbs": 25, "fat": 1},
    "maggi": {"calories": 100, "protein": 3, "carbs": 18, "fat": 2},
    "soup": {"calories": 50, "protein": 3, "carbs": 8, "fat": 1},
    "salad": {"calories": 35, "protein": 1, "carbs": 7, "fat": 0.3},
    "chicken": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6},
    "fish": {"calories": 136, "protein": 20, "carbs": 0, "fat": 5},
    "mutton": {"calories": 250, "protein": 26, "carbs": 0, "fat": 15},
    "vegetables": {"calories": 30, "protein": 2, "carbs": 6, "fat": 0.3},
    "mix veg": {"calories": 60, "protein": 3, "carbs": 10, "fat": 2},
    "aloo gobhi": {"calories": 150, "protein": 4, "carbs": 15, "fat": 8},
    "bhindi": {"calories": 120, "protein": 3, "carbs": 12, "fat": 7},
    "palak paneer": {"calories": 200, "protein": 12, "carbs": 10, "fat": 14},
    "daal makhani": {"calories": 220, "protein": 14, "carbs": 25, "fat": 8},
    
    # Beverages
    "coffee": {"calories": 2, "protein": 0.3, "carbs": 0, "fat": 0},
    "tea": {"calories": 2, "protein": 0, "carbs": 0, "fat": 0},
    "juice": {"calories": 55, "protein": 0.5, "carbs": 14, "fat": 0.2},
    "cold drink": {"calories": 40, "protein": 0, "carbs": 10, "fat": 0},
    "water": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
    
    # Snacks
    "chips": {"calories": 152, "protein": 2, "carbs": 15, "fat": 10},
    "biscuit": {"calories": 60, "protein": 1, "carbs": 8, "fat": 3},
    "cookie": {"calories": 80, "protein": 1, "carbs": 10, "fat": 4},
    "chocolate": {"calories": 230, "protein": 3, "carbs": 25, "fat": 13},
    "ice cream": {"calories": 137, "protein": 2, "carbs": 16, "fat": 7},
    "cake": {"calories": 257, "protein": 3, "carbs": 36, "fat": 12},
    
    # Breakfast
    "cornflakes": {"calories": 100, "protein": 2, "carbs": 24, "fat": 0.5},
    "oats": {"calories": 150, "protein": 5, "carbs": 27, "fat": 3},
    "granola": {"calories": 190, "protein": 4, "carbs": 32, "fat": 6},
    "pancake": {"calories": 175, "protein": 5, "carbs": 22, "fat": 7},
    "waffle": {"calories": 200, "protein": 5, "carbs": 25, "fat": 9},
}

# Activity Calorie Burn Rates (per hour)
ACTIVITY_CALORIES = {
    "badminton": 400,
    "tennis": 450,
    "football": 500,
    "soccer": 450,
    "cricket": 300,
    "basketball": 480,
    "volleyball": 300,
    "hockey": 450,
    "baseball": 350,
    "swimming": 500,
    "running": 600,
    "jogging": 450,
    "walking": 280,
    "cycling": 450,
    "gym": 400,
    "workout": 350,
    "yoga": 200,
    "meditation": 50,
    "dance": 400,
    "dancing": 400,
    "aerobics": 450,
    "boxing": 550,
    "martial arts": 500,
    "karate": 400,
    "table tennis": 280,
    "ping pong": 280,
    "squash": 500,
    "hiking": 400,
    "climbing": 450,
    "skipping": 600,
    "jump rope": 600,
    "burpee": 500,
    "pushups": 300,
    "pullups": 250,
    "weightlifting": 300,
    "stretching": 150,
    "pilates": 280,
    "zumba": 450,
    "cardio": 450,
    "hiit": 500,
    "crossfit": 550,
    "sprinting": 700,
    "marathon": 800,
}


class IntentParser:
    """Intent Parser - Extracts structured data from natural language input"""
    
    def __init__(self):
        self.cohere_api_key = os.environ.get("COHERE_API_KEY")
        self._co = ClientV2(api_key=self.cohere_api_key) if self.cohere_api_key else None
    
    def parse(self, query: str) -> Dict[str, Any]:
        """Parse natural language query into structured data"""
        prompt = f"""
        You are an intent parser for a fitness and nutrition tracking app.
        
        User Message: "{query}"
        
        Extract structured information:
        1. ACTIVITIES - sports, exercises (extract: type, duration in minutes)
        2. MEALS - food, drinks (extract multiple items as a list; each item should have food name, quantity, meal type)
        3. LOGGING QUERY - does user want to log something? (had, ate, played, did, went)
        
        Meal types: breakfast, lunch, dinner, snack
        
        Respond ONLY with JSON:
        {{
            "is_logging_query": true/false,
            "activity": {{"type": "name", "duration_minutes": number}} or null,
            "meals": [{{"food": "name", "quantity": number, "meal_type": "breakfast|lunch|dinner|snack"}}] or []
        }}
        """
        
        if self._co:
            try:
                resp = self._co.chat(
                    model="command-r-plus-08-2024",
                    messages=[{"role": "user", "content": prompt + "\n\nReturn ONLY valid JSON. Do not include markdown blocks or any other text."}],
                    temperature=0.1,
                    max_tokens=300,
                )
                if resp and hasattr(resp, "message") and resp.message.content:
                    text = resp.message.content[0].text
                else:
                    text = ""
                # Strip markdown code blocks if any
                text = text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                elif text.startswith("```"):
                    text = text[3:]
                if text.endswith("```"):
                    text = text[:-3]
                
                return json.loads(text.strip())
            except Exception as e:
                print(f"Intent parsing error: {e}")
        
        return self._keyword_based_parsing(query)
    
    def _keyword_based_parsing(self, query: str) -> Dict[str, Any]:
        """Fallback keyword-based parsing"""
        query_lower = query.lower()
        
        logging_keywords = ["had", "ate", "eaten", "played", "did", "went", "logged", "track", "record"]
        is_logging = any(kw in query_lower for kw in logging_keywords)
        
        activity = None
        meals: List[Dict[str, Any]] = []
        
        # Find activity
        for act_name in ACTIVITY_CALORIES:
            if act_name in query_lower:
                duration = self._extract_duration(query_lower)
                activity = {"type": act_name, "duration_minutes": duration}
                break
        
        # Find foods (very naive fallback: first match only)
        for food_name in FOOD_MACRO_TABLE:
            if food_name in query_lower:
                quantity = self._extract_quantity(query_lower)
                meal_type = self._extract_meal_type(query_lower)
                meals.append({"food": food_name, "quantity": quantity, "meal_type": meal_type})
                break
        
        return {"is_logging_query": is_logging, "activity": activity, "meals": meals}
    
    def _extract_duration(self, query: str) -> int:
        hour_match = re.search(r'(\d+)\s*(?:hour|hours|hr|hrs)', query)
        min_match = re.search(r'(\d+)\s*(?:minute|minutes|mins|min)', query)
        
        if hour_match:
            return int(hour_match.group(1)) * 60
        elif min_match:
            return int(min_match.group(1))
        
        return 30
    
    def _extract_quantity(self, query: str) -> int:
        digit_match = re.search(r'(\d+)\s+\w+', query)
        if digit_match:
            return int(digit_match.group(1))
        return 1
    
    def _extract_meal_type(self, query: str) -> str:
        query_lower = query.lower()
        if "breakfast" in query_lower:
            return "breakfast"
        elif "lunch" in query_lower:
            return "lunch"
        elif "dinner" in query_lower:
            return "dinner"
        elif "snack" in query_lower:
            return "snack"
        return "snack"


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        return float(str(value).strip())
    except Exception:
        return default


def _normalize_meal_type(meal_type: Optional[str]) -> str:
    mt = (meal_type or "snack").strip().lower()
    if mt in {"breakfast", "lunch", "dinner", "snack"}:
        return mt
    return "snack"


class LoggingRouterAgent:
    """LLM-based router for natural language logging"""
    
    def __init__(self):
        self.intent_parser = IntentParser()
    
    def route(self, query: str) -> Dict[str, Any]:
        """Route query to appropriate logging tools"""
        parsed = self.intent_parser.parse(query)
        
        if not parsed.get("is_logging_query", False):
            return {"tools_to_call": [], "parsed_intent": parsed, "confidence": 0.5}
        
        tools_to_call = []
        if parsed.get("activity"):
            tools_to_call.append("activity_logging_tool")
        if parsed.get("meals"):
            tools_to_call.append("nutrition_logging_tool")
        
        return {"tools_to_call": tools_to_call, "parsed_intent": parsed, "confidence": 0.95}


class NutritionLoggingTool:
    """Logs food intake to Supabase using LLM-estimated macros"""
    
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        self.cohere_api_key = os.environ.get("COHERE_API_KEY")
        self._co = ClientV2(api_key=self.cohere_api_key) if self.cohere_api_key else None
    
    def execute(self, meal_data: Dict, user_id: str, date: str = None) -> Dict:
        """Execute food logging"""
        try:
            date = date or datetime.now().strftime("%Y-%m-%d")

            extraction = meal_data.get("extraction")
            if not extraction:
                original_text = meal_data.get("raw_query") or meal_data.get("text") or meal_data.get("query")
                if not original_text:
                    return {"success": False, "error": "No meal extraction or raw_query provided"}
                extraction = self._extract_meals_with_llm(original_text)

            meals = extraction.get("meals") if isinstance(extraction, dict) else None
            if not meals:
                return {"success": False, "error": "Could not extract any foods to log"}

            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates, return=representation"
            }

            payloads: List[Dict[str, Any]] = []
            normalized_meals: List[Dict[str, Any]] = []
            for m in meals:
                if not isinstance(m, dict):
                    continue
                food_name = (m.get("food_name") or m.get("food") or "").strip().lower()
                if not food_name:
                    continue
                quantity = int(_safe_number(m.get("quantity"), 1.0) or 1)
                if quantity <= 0:
                    quantity = 1
                meal_type = _normalize_meal_type(m.get("meal_type"))

                nutrition = m.get("nutrition") or {}
                calories = _safe_number(nutrition.get("calories"), 0.0)
                protein = _safe_number(nutrition.get("protein"), 0.0)
                carbs = _safe_number(nutrition.get("carbs"), 0.0)
                fat = _safe_number(nutrition.get("fat"), 0.0)

                payloads.append({
                    "user_id": user_id,
                    "food_name": food_name,
                    "portion": quantity,
                    "calories": int(round(calories)),
                    "protein": float(round(protein, 1)),
                    "carbs": float(round(carbs, 1)),
                    "fat": float(round(fat, 1)),
                    "meal_type": meal_type,
                    "date": date
                })
                normalized_meals.append({
                    "food_name": food_name,
                    "quantity": quantity,
                    "meal_type": meal_type,
                    "calories": int(round(calories)),
                    "protein": float(round(protein, 1)),
                    "carbs": float(round(carbs, 1)),
                    "fat": float(round(fat, 1)),
                })

            if not payloads:
                return {"success": False, "error": "No valid foods found in extraction"}

            response = requests.post(
                f"{self.supabase_url}/rest/v1/food_logs?on_conflict=user_id,date,meal_type,food_name",
                headers=headers,
                json=payloads
            )

            if response.status_code not in [200, 201]:
                return {"success": False, "error": f"Database error: {response.text}"}

            inserted_rows = response.json() if response.text else []

            return {
                "success": True,
                "tool_name": "nutrition_logging_tool",
                "data": {
                    "logged": True,
                    "date": date,
                    "meals": normalized_meals,
                    "rows": inserted_rows
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _extract_meals_with_llm(self, query: str) -> Dict[str, Any]:
        if not self._co:
            # Fall back to old static lookup behavior when LLM key not present
            parsed_foods: List[Dict[str, Any]] = []
            q = query.lower()
            meal_type = "snack"
            if "breakfast" in q:
                meal_type = "breakfast"
            elif "lunch" in q:
                meal_type = "lunch"
            elif "dinner" in q:
                meal_type = "dinner"
            for food_name, macros in FOOD_MACRO_TABLE.items():
                if food_name in q:
                    qty = 1
                    parsed_foods.append({
                        "food_name": food_name,
                        "quantity": qty,
                        "meal_type": meal_type,
                        "nutrition": {
                            "calories": macros["calories"] * qty,
                            "protein": macros["protein"] * qty,
                            "carbs": macros["carbs"] * qty,
                            "fat": macros["fat"] * qty,
                        }
                    })
            return {"meals": parsed_foods}

        prompt = f"""
        You are a nutrition estimator for a fitness tracking app.

        Convert the user's message into JSON describing one or more foods to log.

        User message: "{query}"

        Requirements:
        - Extract ALL foods mentioned (support multiple foods).
        - Output per-food totals (not per-100g). Calories/protein/carbs/fat should already account for the quantity.
        - Use realistic estimates when exact values are unknown.
        - quantity should be a number (use 1 when unclear).
        - meal_type must be one of: breakfast, lunch, dinner, snack (infer from text; default snack).

        Respond ONLY as JSON with this schema, do not include any other text or markdown:
        {{
          "meals": [
            {{
              "food_name": "chapati",
              "quantity": 3,
              "meal_type": "lunch",
              "nutrition": {{"calories": 360, "protein": 9, "carbs": 60, "fat": 9}}
            }}
          ]
        }}
        """

        try:
            resp = self._co.chat(
                model="command-r-plus-08-2024",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=400,
            )
            if resp and hasattr(resp, "message") and resp.message.content:
                text = resp.message.content[0].text
            else:
                text = ""
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            elif text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            parsed = json.loads(text.strip())
            return parsed if isinstance(parsed, dict) else {"meals": []}
        except Exception as e:
            print(f"Nutrition extraction error: {e}")
            return {"meals": []}


class ActivityLoggingTool:
    """Logs physical activity to Supabase with calorie estimation"""
    
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    def execute(self, activity_data: Dict, user_id: str, date: str = None) -> Dict:
        """Execute activity logging"""
        try:
            date = date or datetime.now().strftime("%Y-%m-%d")
            activity_type = activity_data.get("type", "").lower()
            duration_minutes = activity_data.get("duration_minutes", 30)
            
            cals_per_hour = self._lookup_activity(activity_type)
            if not cals_per_hour:
                return {"success": False, "error": f"Activity '{activity_type}' not found"}
            
            calories_burned = int((cals_per_hour / 60) * duration_minutes)
            
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            
            payload = {
                "user_id": user_id,
                "type": activity_type,
                "duration": duration_minutes,
                "calories_burned": calories_burned,
                "date": date
            }
            
            response = requests.post(
                f"{self.supabase_url}/rest/v1/activities",
                headers=headers,
                json=payload
            )
            
            if response.status_code not in [200, 201]:
                return {"success": False, "error": f"Database error: {response.text}"}
            
            return {
                "success": True,
                "tool_name": "activity_logging_tool",
                "data": {
                    "logged": True,
                    "activity": activity_type,
                    "duration_minutes": duration_minutes,
                    "calories_burned": calories_burned,
                    "date": date
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _lookup_activity(self, activity_name: str) -> Optional[int]:
        if activity_name in ACTIVITY_CALORIES:
            return ACTIVITY_CALORIES[activity_name]
        for key in ACTIVITY_CALORIES:
            if key in activity_name or activity_name in key:
                return ACTIVITY_CALORIES[key]
        return None


class LoggingResponseGenerator:
    """Creates friendly responses for logging operations"""
    
    def generate_response(self, results: List[Dict], parsed_intent: Dict) -> str:
        """Generate friendly response for logged data"""
        parts = []
        
        for result in results:
            if not result.get("success", False):
                parts.append(f"Error: {result.get('error', 'Unknown error')}")
                continue
            
            data = result.get("data", {})
            tool = result.get("tool_name", "")
            
            if tool == "nutrition_logging_tool":
                meals = data.get("meals") or []
                if meals:
                    for m in meals:
                        food = m.get("food_name", "")
                        qty = m.get("quantity", 1)
                        cals = m.get("calories", 0)
                        protein = m.get("protein", 0)
                        meal_type = m.get("meal_type", "meal")
                        parts.append(f"Logged {qty} {food} for {meal_type} ({cals} cal, {protein}g protein)")
                else:
                    parts.append("Logged your meal")
            
            elif tool == "activity_logging_tool":
                activity = data.get("activity", "")
                duration = data.get("duration_minutes", 0)
                cals = data.get("calories_burned", 0)
                parts.append(f"Logged {duration} min of {activity} (~{cals} cal burned)")
        
        if not parts:
            return "Nothing was logged. Please try again!"
        
        parts.append("Your daily stats have been updated!")
        return " | ".join(parts)


def process_logging_query(query: str, user_id: str, date: str = None) -> Dict:
    """
    Main entry point for processing natural language logging queries.
    
    Args:
        query: Natural language input (e.g., "I played badminton for 3 hours and had three chapatis in lunch")
        user_id: User's Supabase ID
        date: Optional date string (YYYY-MM-DD), defaults to today
    
    Returns:
        Dict with success status, answer, and data
    """
    router = LoggingRouterAgent()
    nutrition_tool = NutritionLoggingTool()
    activity_tool = ActivityLoggingTool()
    response_gen = LoggingResponseGenerator()
    
    # Route the query
    routing = router.route(query)
    
    if not routing.get("tools_to_call"):
        return {
            "success": False,
            "answer": "I couldn't detect any activity or food to log. Try saying something like 'I played badminton for 30 minutes' or 'I had 2 eggs for breakfast'.",
            "data": {}
        }
    
    # Execute logging tools
    results = []
    parsed_intent = routing.get("parsed_intent", {})
    
    for tool_name in routing.get("tools_to_call", []):
        if tool_name == "nutrition_logging_tool":
            result = nutrition_tool.execute({"raw_query": query}, user_id, date)
            results.append(result)
        
        elif tool_name == "activity_logging_tool" and parsed_intent.get("activity"):
            result = activity_tool.execute(parsed_intent["activity"], user_id, date)
            results.append(result)
    
    # Generate response
    answer = response_gen.generate_response(results, parsed_intent)
    
    return {
        "success": True,
        "answer": answer,
        "data": {
            "logged_items": [r.get("data", {}) for r in results if r.get("success")],
            "parsed_intent": parsed_intent
        }
    }


# ==========================================
# Example Usage
# ==========================================

if __name__ == "__main__":
    # Test the logging agent
    test_queries = [
        "I played badminton for 3 hours",
        "I ate 2 eggs and a banana",
        "I played badminton for 3 hours and had three chapatis in lunch",
        "Went to gym for 1 hour",
        "Had lunch - 2 chapatis with dal"
    ]
    
    print("=" * 60)
    print("Natural Language Logging Agent - Test Queries")
    print("=" * 60)
    
    for query in test_queries:
        print(f"\n🔍 Query: {query}")
        result = process_logging_query(query, user_id="test-user-123")
        print(f"✅ Answer: {result['answer']}")
        print("-" * 60)

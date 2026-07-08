import os
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import cohere
from supabase import create_client, Client

try:
    from langgraph_agent import FOOD_MACRO_TABLE
except Exception:
    FOOD_MACRO_TABLE = {}


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


def _extract_json_from_text(text: str) -> Optional[str]:
    t = (text or "").strip()
    if not t:
        return None
    if t.startswith("{") or t.startswith("["):
        return t
    m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", t)
    return m.group(1).strip() if m else None


class NutritionTool:
    name = "nutrition_logging_tool"

    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
        self.cohere_api_key = os.environ.get("COHERE_API_KEY")

        if not self.supabase_url or not self.supabase_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY must be configured")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self._client = cohere.ClientV2(self.cohere_api_key) if self.cohere_api_key else None

    def _get_supabase_for_user(self, user_jwt: Optional[str]) -> Client:
        if not user_jwt:
            return self.supabase
        client = create_client(self.supabase_url, self.supabase_key)
        try:
            client.postgrest.auth(user_jwt)
        except Exception:
            pass
        return client

    def _ensure_user_exists(self, user_id: str, user_jwt: Optional[str] = None) -> None:
        """Ensure a row exists in public.users for this auth user."""
        try:
            # Use user-specific client if available to leverage RLS insert policies
            supabase = self._get_supabase_for_user(user_jwt)
            result = supabase.table("users").select("id").eq("id", user_id).execute()
            if result.data and len(result.data) > 0:
                return

            # Row is missing — try to fetch data from Supabase Auth admin API (needs service role)
            email = f"{user_id[:8]}@fitfusion.app"
            name = user_id[:8]
            try:
                auth_resp = self.supabase.auth.admin.get_user_by_id(user_id)
                if auth_resp and auth_resp.user:
                    email = auth_resp.user.email or email
                    meta = auth_resp.user.user_metadata or {}
                    name = meta.get("name") or meta.get("full_name") or email.split("@")[0]
            except Exception as ae:
                print(f"[NutritionTool] auth.admin.get_user_by_id failed: {ae}")

            supabase.table("users").insert({
                "id": user_id,
                "email": email,
                "name": name,
                "college": "Not set",
                "role": "student",
            }).execute()
            print(f"[NutritionTool] Created missing user row for {user_id}")
        except Exception as e:
            print(f"[NutritionTool] _ensure_user_exists warning: {e}")

    def execute(self, *, query: str, user_id: str, date: Optional[str] = None, user_jwt: Optional[str] = None) -> Dict[str, Any]:
        date = date or datetime.now().strftime("%Y-%m-%d")

        extraction = self._extract_meals_with_llm(query)
        meals = extraction.get("meals") if isinstance(extraction, dict) else None
        if not meals:
            return {"success": False, "tool_name": self.name, "error": "Could not extract any foods to log", "data": {}}

        return self.execute_meals(meals=meals, user_id=user_id, date=date, user_jwt=user_jwt)

    def execute_meals(self, *, meals: List[Dict[str, Any]], user_id: str, date: Optional[str] = None, user_jwt: Optional[str] = None) -> Dict[str, Any]:
        date = date or datetime.now().strftime("%Y-%m-%d")

        rows: List[Dict[str, Any]] = []
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
            calories = int(round(_safe_number(nutrition.get("calories"), 0.0)))
            protein = float(round(_safe_number(nutrition.get("protein"), 0.0), 1))
            carbs = float(round(_safe_number(nutrition.get("carbs"), 0.0), 1))
            fat = float(round(_safe_number(nutrition.get("fat"), 0.0), 1))

            rows.append(
                {
                    "user_id": user_id,
                    "food_name": food_name,
                    "calories": calories,
                    "protein": protein,
                    "carbs": carbs,
                    "fat": fat,
                    "meal_type": meal_type,
                    "date": date,
                }
            )

            normalized_meals.append(
                {
                    "food_name": food_name,
                    "quantity": quantity,
                    "meal_type": meal_type,
                    "calories": calories,
                    "protein": protein,
                    "carbs": carbs,
                    "fat": fat,
                }
            )

        if not rows:
            return {"success": False, "tool_name": self.name, "error": "No valid foods found in extraction", "data": {}}

        supabase = self._get_supabase_for_user(user_jwt)
        self._ensure_user_exists(user_id, user_jwt)
        inserted = (
            supabase.table("food_logs")
            .upsert(rows, on_conflict="user_id,date,meal_type,food_name")
            .execute()
        )
        inserted_rows = inserted.data or []

        return {
            "success": True,
            "tool_name": self.name,
            "data": {"logged": True, "date": date, "meals": normalized_meals, "rows": inserted_rows},
        }

    def _extract_meals_with_llm(self, query: str) -> Dict[str, Any]:
        if not self._client:
            return self._extract_meals_fallback(query)

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

Respond ONLY as JSON with this schema:
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

        response = self._client.chat(
            model="command-r-plus-08-2024",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.2,
        )

        raw = ""
        if getattr(response, "text", None):
            raw = (response.text or "").strip()
        elif getattr(response, "message", None) and getattr(response.message, "content", None):
            blocks = response.message.content or []
            if isinstance(blocks, str):
                raw = blocks.strip()
            else:
                parts: List[str] = []
                for b in blocks:
                    if isinstance(b, str):
                        parts.append(b)
                    elif getattr(b, "text", None):
                        parts.append(b.text)
                raw = "".join(parts).strip()
        json_text = _extract_json_from_text(raw)
        if not json_text:
            return {"meals": []}
        try:
            parsed = json.loads(json_text)
            return parsed if isinstance(parsed, dict) else {"meals": []}
        except Exception:
            return self._extract_meals_fallback(query)

    def _extract_meals_fallback(self, query: str) -> Dict[str, Any]:
        q = (query or "").lower()
        meal_type = "snack"
        if "breakfast" in q:
            meal_type = "breakfast"
        elif "lunch" in q:
            meal_type = "lunch"
        elif "dinner" in q:
            meal_type = "dinner"

        meals: List[Dict[str, Any]] = []
        for food_name, macros in (FOOD_MACRO_TABLE or {}).items():
            if food_name in q:
                qty = 1
                m = re.search(r"(\d+)\s+" + re.escape(food_name) + r"\b", q)
                if m:
                    try:
                        qty = int(m.group(1))
                    except Exception:
                        qty = 1
                meals.append(
                    {
                        "food_name": food_name,
                        "quantity": qty,
                        "meal_type": meal_type,
                        "nutrition": {
                            "calories": (macros.get("calories") or 0) * qty,
                            "protein": (macros.get("protein") or 0) * qty,
                            "carbs": (macros.get("carbs") or 0) * qty,
                            "fat": (macros.get("fat") or 0) * qty,
                        },
                    }
                )

        return {"meals": meals}

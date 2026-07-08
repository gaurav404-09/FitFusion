import os
from datetime import datetime
from typing import Any, Dict, Optional

from supabase import create_client, Client


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return float(value)
        return float(str(value).strip())
    except Exception:
        return default


class ActivityTool:
    name = "activity_logging_tool"

    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

        if not self.supabase_url or not self.supabase_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY must be configured")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    def _get_supabase_for_user(self, user_jwt: Optional[str]) -> Client:
        if not user_jwt:
            return self.supabase
        client = create_client(self.supabase_url, self.supabase_key)
        try:
            client.postgrest.auth(user_jwt)
        except Exception:
            pass
        return client

    def _ensure_user_exists(self, user_id: str) -> None:
        """Upsert a minimal row in the users table so FK constraints pass."""
        try:
            self.supabase.table("users").upsert(
                {"id": user_id},
                on_conflict="id",
                ignore_duplicates=True,
            ).execute()
        except Exception as e:
            print(f"[ActivityTool] _ensure_user_exists warning: {e}")

    def execute(self, *, activity: Dict[str, Any], user_id: str, date: Optional[str] = None, user_jwt: Optional[str] = None) -> Dict[str, Any]:
        date = date or datetime.now().strftime("%Y-%m-%d")

        
        duration_minutes = int(_safe_number(activity.get("duration_minutes") or activity.get("duration"), 30.0) or 30)
        calories_burned = int(_safe_number(activity.get("calories_burned") or activity.get("caloriesBurned"), 0.0) or 0)

        payload = {
            "user_id": user_id,
            "type": activity.get("type") or activity.get("activity") or "other",
            "duration": duration_minutes,
            "calories_burned": calories_burned,
            "date": date,
        }
        

        supabase = self._get_supabase_for_user(user_jwt)
        self._ensure_user_exists(user_id)
        inserted = supabase.table("activities").insert(payload).execute()
        inserted_rows = inserted.data or []

        return {
            "success": True,
            "tool_name": self.name,
            "data": {
                "logged": True,
                "activity": activity.get("type") or activity.get("activity") or "exercise",
                "duration_minutes": duration_minutes,
                "calories_burned": calories_burned,
                "date": date,
                "rows": inserted_rows,
            },
        }

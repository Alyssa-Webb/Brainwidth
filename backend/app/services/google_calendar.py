"""
Real Google Calendar integration via OAuth2.

Setup:
1. Place your credentials.json in the backend/ directory (or backend/app/).
2. On first run, a browser window will open for OAuth consent.
3. A token.json is saved next to credentials.json and reused on subsequent calls.

The event list is fetched for the next 7 days and each event is assigned a
mental_tax value computed from its duration and inferred type / title keywords.
"""

import os
import datetime
import json
from pathlib import Path

from app.engine.calculator import calculate_mental_tax, is_restful, RESTFUL_WEIGHTS

# ── Credentials paths ───────────────────────────────────────────────────────────
# Looks in: backend/ (2 levels up from this file: backend/app/services → backend/app → backend)
_BASE_DIR = Path(__file__).resolve().parents[2]  # = backend/
_CREDENTIALS_PATHS = [
    _BASE_DIR / "credentials.json",           # backend/credentials.json ← primary
    _BASE_DIR / "app" / "credentials.json",   # backend/app/credentials.json
]


SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

# ── Type inference from event summary/description keywords ──────────────────────
_TYPE_KEYWORDS = {
    "STEM":       ["math", "calculus", "physics", "chemistry", "biology", "lab", "engineering",
                   "cs", "coding", "programming", "algorithm", "data", "stats", "exam", "quiz", "midterm", "final"],
    "Deep Work":  ["thesis", "research", "project", "design", "architecture", "write", "draft", "analysis", "report"],
    "Meeting":    ["meeting", "standup", "sync", "office hours", "lecture", "class", "seminar", "discussion"],
    "Creative":   ["art", "design", "music", "sketch", "brainstorm", "creative", "paint", "draw"],
    "Admin":      ["admin", "email", "errand", "appointment", "dentist", "doctor", "bank", "chore"],
    # Restful (these will get negative tax automatically via is_restful())
    "Gym":        ["gym", "workout", "exercise", "yoga", "swim", "run", "jog", "hike", "bike", "crossfit", "pilates", "spin"],
    "Meditation": ["meditation", "meditate", "mindfulness", "breathwork"],
    "Rest":       ["nap", "sleep", "rest", "relax", "leisure", "chill"],
    "Walk":       ["walk", "stroll", "dog"],
    "Social":     ["coffee", "dinner", "lunch", "hangout", "party", "date", "friend", "family"],
}

_DURATION_DEFAULTS = {
    "STEM": 1.5,
    "Deep Work": 2.0,
    "Meeting": 1.0,
    "Creative": 1.5,
    "Admin": 0.5,
    "Gym": 1.0,
    "Meditation": 0.5,
    "Rest": 1.0,
    "Walk": 0.5,
    "Social": 1.5,
}


def _infer_type(summary: str, description: str = "") -> str:
    text = (summary + " " + (description or "")).lower()
    for task_type, keywords in _TYPE_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return task_type
    return "Meeting"  # default


def _get_credentials():
    """Loads OAuth2 credentials, running local server flow if no token exists."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    # Find credentials.json
    creds_path = None
    for p in _CREDENTIALS_PATHS:
        if p.exists():
            creds_path = p
            break
    if creds_path is None:
        return None  # credentials.json not found → fall back to mock

    # Find token.json (same dir as credentials.json)
    token_path = creds_path.parent / "token.json"

    creds = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(str(token_path), "w") as token:
                token.write(creds.to_json())
        else:
            # If no valid token exists, return None. The user must connect via the frontend > /api/auth/gcal/authorize
            return None

    return creds


def _parse_gcal_event(event: dict, today: datetime.date) -> dict | None:
    """
    Converts a raw GCal API event dict into our unified event format.
    Returns None if the event is all-day (no time) or out of range.
    """
    start = event.get("start", {})
    end   = event.get("end", {})

    # Skip all-day events (no dateTime)
    start_str = start.get("dateTime") or start.get("date")
    end_str   = end.get("dateTime")   or end.get("date")
    if not start_str or not end_str:
        return None

    try:
        if "T" in start_str:
            start_dt = datetime.datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            end_dt   = datetime.datetime.fromisoformat(end_str.replace("Z",   "+00:00"))
        else:
            # all-day format "YYYY-MM-DD"
            start_dt = datetime.datetime.strptime(start_str, "%Y-%m-%d")
            end_dt   = datetime.datetime.strptime(end_str,   "%Y-%m-%d")
    except Exception:
        return None

    # Convert to UTC-naive for day offset calculation
    start_naive = start_dt.replace(tzinfo=None)
    end_naive   = end_dt.replace(tzinfo=None)

    day_offset = (start_naive.date() - today).days
    if not (0 <= day_offset < 7):
        return None

    duration_hours = max(0.25, (end_naive - start_naive).total_seconds() / 3600)
    summary     = event.get("summary", "Untitled Event")
    description = event.get("description", "")
    location    = event.get("location", "")
    event_id    = event.get("id", f"gcal_{day_offset}")

    # We now skip computing tax here if AI classification runs, but provide fallback in case AI is disabled
    event_type  = _infer_type(summary, description)
    tax, _      = calculate_mental_tax(duration_hours, event_type, title=summary)

    # _parse_gcal_event acts as a pre-filter now. We attach the raw dict for the AI layer
    return {
        "_raw_event": event,
        "id": event_id,
        "title": summary,
        "duration": round(duration_hours, 2),
        "type": event_type,
        "date": start_naive.isoformat() + "Z",
        "start_hour": start_naive.hour,
        "end_hour": min(23, start_naive.hour + int(duration_hours)),
        "location": location,
        "priority": "medium",
        "mental_tax": round(tax, 2),
        "source": "Google Calendar",
        "is_restful": is_restful(event_type, summary),
    }


async def fetch_events_next_7_days(user_id: str = None, force_sync: bool = False) -> list:
    """
    Fetches real Google Calendar events for the next 7 days.
    Caches AI classification to avoid Gemini API limits.
    Falls back to mock events if credentials.json is not found.
    """
    today = datetime.datetime.utcnow().date()
    time_min = datetime.datetime.utcnow().isoformat() + "Z"
    time_max = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat() + "Z"

    try:
        from googleapiclient.discovery import build
        creds = _get_credentials()
        if creds is None:
            return _mock_events(today)

        service = build("calendar", "v3", credentials=creds)
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                maxResults=100,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        raw_events = events_result.get("items", [])
        from app.services.ai_calendar import classify_events_with_ai
        
        events = []
        for ev in raw_events:
            parsed = _parse_gcal_event(ev, today)
            if parsed:
                events.append(parsed)
                
        # Optional Caching Logic
        db = None
        if user_id:
            from app.services.db_service import get_db
            try:
                db = get_db()
            except Exception:
                pass
                
        cached_ai = {}
        if db is not None:
            # Load user's cached event classifications
            try:
                cursor = db.gcal_cache.find({"user_id": user_id})
                docs = await cursor.to_list(length=500)
                for d in docs:
                    cached_ai[d["event_id"]] = {"type": d["type"], "is_restful": d["is_restful"]}
            except Exception as e:
                print(f"[GCal] Cache fetch error: {e}")

        # Batch classify via AI, ONLY for new events not in cache or if forced
        raw_to_classify = []
        for ev in events:
            if force_sync or ev["id"] not in cached_ai:
                raw_to_classify.append(ev["_raw_event"])
                
        ai_mapping = {}
        if raw_to_classify:
            print(f"[AI Calendar] Calling Gemini to classify {len(raw_to_classify)} NEW events...")
            try:
                ai_mapping = await classify_events_with_ai(raw_to_classify)
            except Exception as e:
                print(f"[AI Calendar] Skipping AI due to error: {e}")
                
            # Save new ones to cache
            if db is not None and ai_mapping:
                for eid, data in ai_mapping.items():
                    await db.gcal_cache.update_one(
                        {"user_id": user_id, "event_id": eid},
                        {"$set": {"type": data["type"], "is_restful": data["is_restful"]}},
                        upsert=True
                    )
                    cached_ai[eid] = data # Add to local memory dict to merge
        
        # Merge classifications into final events
        for ev in events:
            ev.pop("_raw_event", None)  # clean up temp data
            if ev["id"] in cached_ai:
                ai_data = cached_ai[ev["id"]]
                ev["type"] = ai_data["type"]
                ev["is_restful"] = ai_data["is_restful"]
                # Recompute tax based on AI type
                tax, _ = calculate_mental_tax(ev["duration"], ev["type"], title=ev["title"])
                ev["mental_tax"] = round(tax, 2)
                
        print(f"[GCal] Fetched {len(events)} events (AI processed).")
        return events

    except Exception as e:
        print(f"[GCal] Error fetching real events: {e}. Falling back to mock data.")
        return _mock_events(today)


async def create_event(
    title: str,
    date: str,
    duration: float,
    event_type: str,
    location: str = "",
    priority: str = "medium"
) -> dict:
    """
    Creates a new Google Calendar event.
    Falls back to a local mock if credentials are not available.
    """
    today = datetime.datetime.utcnow().date()
    tax, _ = calculate_mental_tax(duration, event_type, title=title)

    start_hour = 9
    try:
        dt = datetime.datetime.fromisoformat(date.replace("Z", "+00:00"))
        start_hour = dt.hour
    except Exception:
        pass

    date_iso = date if "T" in date else f"{date}T{start_hour:02d}:00:00Z"

    # Attempt to write to real GCal
    try:
        from googleapiclient.discovery import build
        creds = _get_credentials()
        if creds:
            service = build("calendar", "v3", credentials=creds)
            start_dt = datetime.datetime.fromisoformat(date_iso.replace("Z", "+00:00"))
            end_dt   = start_dt + datetime.timedelta(hours=duration)
            body = {
                "summary": title,
                "location": location,
                "description": f"Added via Brainwidth · Type: {event_type} · Tax: {round(tax, 2)}τ",
                "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
                "end":   {"dateTime": end_dt.isoformat(),   "timeZone": "UTC"},
            }
            created = service.events().insert(calendarId="primary", body=body).execute()
            print(f"[GCal] Created event: {created.get('htmlLink')}")
            return {
                "id": created["id"],
                "title": title,
                "duration": duration,
                "type": event_type,
                "date": date_iso,
                "start_hour": start_hour,
                "end_hour": start_hour + int(duration),
                "location": location,
                "priority": priority,
                "mental_tax": round(tax, 2),
                "source": "Flux Task",
            }
    except Exception as e:
        print(f"[GCal] Could not create real event: {e}")

    # Mock fallback
    return {
        "id": f"task_{datetime.datetime.utcnow().timestamp()}",
        "title": title,
        "duration": duration,
        "type": event_type,
        "date": date_iso,
        "start_hour": start_hour,
        "end_hour": start_hour + int(duration),
        "location": location,
        "priority": priority,
        "mental_tax": round(tax, 2),
        "source": "Flux Task (mock)",
    }


# ── Mock fallback for when credentials.json is absent ───────────────────────────

def _m(eid, title, dur, etype, day_offset, hour, location=""):
    today = datetime.datetime.utcnow().date()
    event_date = (today + datetime.timedelta(days=day_offset)).isoformat()
    tax, _ = calculate_mental_tax(dur, etype, title=title)
    return {
        "id": eid,
        "title": title,
        "duration": dur,
        "type": etype,
        "date": f"{event_date}T{hour:02d}:00:00Z",
        "start_hour": hour,
        "end_hour": hour + int(dur),
        "location": location,
        "priority": "medium",
        "mental_tax": round(tax, 2),
        "source": "Default Calendar",
        "is_restful": is_restful(etype, title),
    }


def _mock_events(today: datetime.date) -> list:
    return [
        _m("gcal_0a", "Calculus Lecture",             1.5, "STEM",      0, 9,  "Math Dept 101"),
        _m("gcal_0b", "Team Stand-up",                0.5, "Meeting",   0, 11, "Zoom"),
        _m("gcal_1a", "Software Engineering Sync",    1.0, "Meeting",   1, 10, "CS Building 204"),
        _m("gcal_1b", "Office Hours (TA)",             1.0, "Admin",    1, 14, "Library Room 3"),
        _m("gcal_2a", "Deep Work: Architecture",       3.0, "Deep Work", 2, 13),
        _m("gcal_3a", "Physics Lab",                   2.0, "STEM",      3, 9,  "Science Hall 110"),
        _m("gcal_3b", "Study Group",                   1.5, "Deep Work", 3, 15, "Library"),
        _m("gcal_4a", "Doctor Appointment",            1.5, "Admin",     4, 14, "Student Health Center"),
        _m("gcal_5a", "Gym Session",                   1.0, "Gym",       5, 10, "Campus Gym"),
        _m("gcal_6a", "Meditation",                    0.5, "Meditation",6, 8),
        _m("gcal_6b", "Project Presentation Prep",    2.0, "Deep Work", 6, 14),
    ]
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
    from google_auth_oauthlib.flow import InstalledAppFlow
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
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(str(token_path), "w") as token:
            token.write(creds.to_json())

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

    event_type  = _infer_type(summary, description)
    # Compute signed tax — pass title so is_restful() can detect gym/meditation etc.
    tax, _      = calculate_mental_tax(duration_hours, event_type, title=summary)

    return {
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


def fetch_events_next_7_days() -> list:
    """
    Fetches real Google Calendar events for the next 7 days.
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
        events = []
        for ev in raw_events:
            parsed = _parse_gcal_event(ev, today)
            if parsed:
                events.append(parsed)
        print(f"[GCal] Fetched {len(events)} real events from Google Calendar.")
        return events

    except Exception as e:
        print(f"[GCal] Error fetching real events: {e}. Falling back to mock data.")
        return _mock_events(today)


def create_event(
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
                "description": f"Added via Flux · Type: {event_type} · Tax: {round(tax, 2)}τ",
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
        "source": "Google Calendar (demo)",
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

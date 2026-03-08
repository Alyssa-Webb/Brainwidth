"""
Enriched Google Calendar service.
Provides mock events across 7 days, each tagged with a computed mental_tax.
Also provides create_event() for new tasks being added from the Tasks tab.
"""

import datetime
from app.engine.calculator import calculate_mental_tax

def _make_event(
    event_id: str,
    title: str,
    duration: float,
    event_type: str,
    day_offset: int,
    hour: int,
    location: str = "",
    priority: str = "medium"
) -> dict:
    today = datetime.datetime.utcnow().date()
    event_date = (today + datetime.timedelta(days=day_offset)).isoformat()
    tax, _ = calculate_mental_tax(duration, event_type)
    return {
        "id": event_id,
        "title": title,
        "duration": duration,
        "type": event_type,
        "date": f"{event_date}T{hour:02d}:00:00Z",
        "start_hour": hour,
        "end_hour": hour + int(duration),
        "location": location,
        "priority": priority,
        "mental_tax": round(tax, 2),
        "source": "Google Calendar",
    }


def fetch_events_next_7_days() -> list:
    """
    Returns enriched mock Google Calendar events for the next 7 days,
    each with pre-computed mental_tax so the UI can show them directly.
    """
    return [
        # Day 0 – Today
        _make_event("gcal_0a", "Calculus Lecture", 1.5, "STEM", 0, 9, "Math Dept 101"),
        _make_event("gcal_0b", "Team Stand-up", 0.5, "Meeting", 0, 11, "Zoom"),
        # Day 1 – Tomorrow
        _make_event("gcal_1a", "Software Engineering Sync", 1.0, "Meeting", 1, 10, "CS Building 204"),
        _make_event("gcal_1b", "Office Hours (TA)", 1.0, "Admin", 1, 14, "Library Room 3"),
        # Day 2
        _make_event("gcal_2a", "Deep Work: Architecture Design", 3.0, "Deep Work", 2, 13),
        # Day 3
        _make_event("gcal_3a", "Physics Lab", 2.0, "STEM", 3, 9, "Science Hall 110"),
        _make_event("gcal_3b", "Study Group", 1.5, "Deep Work", 3, 15, "Library"),
        # Day 4
        _make_event("gcal_4a", "Doctor Appointment", 1.5, "Admin", 4, 14, "Student Health Center"),
        # Day 5 – Weekend
        _make_event("gcal_5a", "Gym Session", 1.0, "Physical", 5, 10, "Campus Gym"),
        # Day 6
        _make_event("gcal_6a", "Project Presentation Prep", 2.0, "Deep Work", 6, 14),
    ]


def create_event(
    title: str,
    date: str,
    duration: float,
    event_type: str,
    location: str = "",
    priority: str = "medium"
) -> dict:
    """
    Creates a new mock GCal event (in a real impl, this would call the GCal API).
    Returns the event dict with a computed mental_tax.
    """
    tax, _ = calculate_mental_tax(duration, event_type)
    # Default start hour to 9am if not specified
    start_hour = 9
    try:
        dt = datetime.datetime.fromisoformat(date.replace("Z", "+00:00"))
        start_hour = dt.hour
    except Exception:
        pass
    
    return {
        "id": f"task_{datetime.datetime.utcnow().timestamp()}",
        "title": title,
        "duration": duration,
        "type": event_type,
        "date": date if "T" in date else f"{date}T{start_hour:02d}:00:00Z",
        "start_hour": start_hour,
        "end_hour": start_hour + int(duration),
        "location": location,
        "priority": priority,
        "mental_tax": round(tax, 2),
        "source": "Flux Task",
    }

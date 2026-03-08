from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from bson import ObjectId

from app.engine.calculator import (
    calculate_mental_tax, get_hourly_load_curve, build_decompression_breaks,
    is_restful
)
from app.services.db_service import get_db
from app.parser.pdf_parser import parse_syllabus_and_extract_tasks
from app.api.deps import get_current_user
from app.services.recommendations import generate_recommendations

router = APIRouter()

class TaskInput(BaseModel):
    id: str
    title: str
    duration: float
    type: str

class TaskOutput(BaseModel):
    id: str
    title: str
    duration: float
    type: str
    mental_tax: float
    context_switched: bool

@router.get("/tasks", response_model=List[dict])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if db is None:
        return []
    cursor = db.tasks.find({"user_id": str(current_user["_id"])}).limit(20)
    tasks = await cursor.to_list(length=20)
    result = []
    for task in tasks:
        result.append({
            "id": str(task["_id"]),
            "title": str(task.get("title", "Untitled")),
            "duration": float(task.get("duration", 1.0) or 1.0),
            "type": str(task.get("type", "Admin")),
            "cognitive_weight": float(task.get("cognitive_weight", 0.5))
        })
    return result

@router.post("/calculate-tax", response_model=List[TaskOutput])
def calculate_tax(tasks: List[TaskInput]):
    result = []
    prev_type = None
    for task in tasks:
        tax, ctx_switch = calculate_mental_tax(task.duration, task.type, prev_type)
        result.append(TaskOutput(
            id=task.id,
            title=task.title,
            duration=task.duration,
            type=task.type,
            mental_tax=tax,
            context_switched=ctx_switch
        ))
        prev_type = task.type
    return result

@router.get("/auth/gcal/authorize")
async def gcal_authorize(current_user: dict = Depends(get_current_user)):
    """
    Returns the Google OAuth consent URL for the user to visit.
    Frontend should redirect to this URL.
    """
    import json
    from pathlib import Path
    from google_auth_oauthlib.flow import Flow

    BASE_DIR = Path(__file__).resolve().parents[3]  # repo root / backend
    creds_paths = [BASE_DIR / "backend" / "credentials.json", BASE_DIR / "credentials.json"]
    creds_path = next((p for p in creds_paths if p.exists()), None)
    if not creds_path:
        raise HTTPException(status_code=500, detail="credentials.json not found in backend/")

    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    REDIRECT_URI = "http://localhost:8000/api/auth/gcal/callback"

    flow = Flow.from_client_secrets_file(str(creds_path), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, _ = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent")
    return {"auth_url": auth_url}


@router.get("/auth/gcal/callback")
async def gcal_callback(code: str, state: str = ""):
    """
    Handles the OAuth redirect from Google.
    Exchanges the auth code for access+refresh tokens and saves token.json.
    """
    import json
    from pathlib import Path
    from google_auth_oauthlib.flow import Flow
    from fastapi.responses import HTMLResponse

    BASE_DIR = Path(__file__).resolve().parents[3]
    creds_paths = [BASE_DIR / "backend" / "credentials.json", BASE_DIR / "credentials.json"]
    creds_path = next((p for p in creds_paths if p.exists()), None)
    if not creds_path:
        raise HTTPException(status_code=500, detail="credentials.json not found")

    SCOPES = ["https://www.googleapis.com/auth/calendar"]
    REDIRECT_URI = "http://localhost:8000/api/auth/gcal/callback"

    import os
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # allow http for localhost

    flow = Flow.from_client_secrets_file(str(creds_path), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    flow.fetch_token(code=code)
    creds = flow.credentials

    token_path = creds_path.parent / "token.json"
    with open(str(token_path), "w") as f:
        f.write(creds.to_json())

    return HTMLResponse("""
    <html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f0f12;color:#fff">
      <h2 style="color:#6366f1">✅ Google Calendar Connected!</h2>
      <p>Your calendar is now linked to Flux. You can close this tab.</p>
      <script>setTimeout(()=>window.close(),2000)</script>
    </body></html>
    """)


@router.get("/auth/gcal/status")
async def gcal_status(current_user: dict = Depends(get_current_user)):
    """Returns whether the user has connected Google Calendar (token.json exists and is valid)."""
    from pathlib import Path
    from google.oauth2.credentials import Credentials

    BASE_DIR = Path(__file__).resolve().parents[3]
    creds_paths = [BASE_DIR / "backend" / "credentials.json", BASE_DIR / "credentials.json"]
    creds_path = next((p for p in creds_paths if p.exists()), None)
    if creds_path:
        token_path = creds_path.parent / "token.json"
        if token_path.exists():
            try:
                creds = Credentials.from_authorized_user_file(str(token_path))
                return {"connected": True, "expired": creds.expired}
            except Exception:
                pass
    return {"connected": False}


@router.post("/upload-syllabus")

async def upload_syllabus(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        import datetime
        content = await file.read()
        extracted_tasks = parse_syllabus_and_extract_tasks(content)
        db = get_db()
        saved_count = 0
        skipped_count = 0
        
        if db is not None and extracted_tasks:
            # Fetch existing task titles for this user to avoid double-counting
            existing_cursor = db.tasks.find({"user_id": str(current_user["_id"])}, {"title": 1})
            existing_tasks = await existing_cursor.to_list(length=500)
            existing_titles = {t["title"].strip().lower() for t in existing_tasks if t.get("title")}
            
            tasks_to_insert = []
            for task in extracted_tasks:
                task["user_id"] = str(current_user["_id"])
                if task["title"].strip().lower() in existing_titles:
                    skipped_count += 1
                else:
                    tasks_to_insert.append(task)
            
            if tasks_to_insert:
                result = await db.tasks.insert_many(tasks_to_insert)
                saved_count = len(result.inserted_ids)
                print(f"Inserted {saved_count} records, skipped {skipped_count} duplicates")
            
            # Save syllabus metadata to 'syllabi' collection
            await db.syllabi.insert_one({
                "user_id": str(current_user["_id"]),
                "filename": file.filename,
                "uploaded_at": datetime.datetime.utcnow(),
                "task_count": saved_count,
                "skipped_count": skipped_count,
            })
                
        for t in extracted_tasks:
            t["_id"] = str(t.get("_id", ""))
            if hasattr(t["due_date"], "isoformat"):
                t["due_date"] = t["due_date"].isoformat()
            t.pop("vector_embedding", None)
            
        return {
            "message": f"Saved {saved_count} new tasks ({skipped_count} duplicates skipped).",
            "tasks": extracted_tasks
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class OptimizedTaskItem(BaseModel):
    source: str
    title: str
    mental_tax: float
    is_fixed: bool
    start_hour: Optional[int] = None

class DailySchedule(BaseModel):
    total_load: float
    tasks: List[OptimizedTaskItem]
    hourly_load: List[float] = Field(default_factory=lambda: [0.0] * 24)

class OptimizedWeekResponse(BaseModel):
    max_daily_load: float
    is_overloaded: bool
    base_capacity: float
    schedule: Dict[str, DailySchedule]

@router.get("/optimize", response_model=OptimizedWeekResponse)
async def optimize_week(
    decompress: bool = False,
    current_user: dict = Depends(get_current_user)
):
    import datetime
    from app.services.google_calendar import fetch_events_next_7_days
    from app.services.optimizer import balance_schedule
    
    chronotype = current_user.get("chronotype", "neutral")
    base_capacity = float(current_user.get("base_capacity", 8.0))
    work_start = int(current_user.get("work_start_hour", 8))
    work_end = int(current_user.get("work_end_hour", 20))
    
    def parse_date(date_data):
        if not date_data:
            return datetime.datetime.utcnow().date()
        if isinstance(date_data, datetime.datetime):
            return date_data.date()
        try:
            if isinstance(date_data, str):
                if date_data.endswith('Z'):
                    date_data = date_data[:-1] + '+00:00'
                return datetime.datetime.fromisoformat(date_data).date()
        except Exception:
            pass
        return datetime.datetime.utcnow().date()
        
    today = datetime.datetime.utcnow().date()
    
    gcal_events = fetch_events_next_7_days()
    
    fixed_load_per_day = [0.0] * 7
    for event in gcal_events:
        # Use the pre-computed signed tax (negative for gym/meditation/rest)
        tax = event.get("mental_tax", 0.0)
        event_date = parse_date(event["date"])
        day_diff = (event_date - today).days
        if 0 <= day_diff < 7:
            fixed_load_per_day[day_diff] += tax
            # Floor per-day to 0 immediately (recovery can't push below 0)
            fixed_load_per_day[day_diff] = max(0.0, fixed_load_per_day[day_diff])

    db = get_db()
    flux_tasks = []
    if db is not None:
        cursor = db.tasks.find({"user_id": str(current_user["_id"])})
        flux_tasks = await cursor.to_list(length=100)
    
    flexible_tasks = []
    for t in flux_tasks:
        title = t.get("title", "")
        tax, _ = calculate_mental_tax(t.get("duration", 1.0), t.get("type", "Admin"), title=title)
        flexible_tasks.append({
            "id": str(t["_id"]),
            "title": title,
            "duration": t.get("duration", 1.0),
            "type": t.get("type", "Admin"),
            "mental_tax": tax
        })
    
    # If decompress=true: sort by tax, call build_decompression_breaks per day after scheduling
    if decompress:
        flexible_tasks = sorted(flexible_tasks, key=lambda x: x["mental_tax"])
        
    schedule_mapping, max_load = balance_schedule(flexible_tasks, fixed_load_per_day)

    optimized_week: Dict[str, DailySchedule] = {}
    daily_task_buckets: dict = {}  # day_key -> list of task dicts for hourly curve
    
    for i in range(7):
        day_key = f"Day {i} ({(today + datetime.timedelta(days=i)).isoformat()})"
        optimized_week[day_key] = DailySchedule(
            total_load=fixed_load_per_day[i],
            tasks=[],
            hourly_load=[0.0] * 24
        )
        daily_task_buckets[day_key] = []
    
    # Add fixed GCal events
    for event in gcal_events:
        event_date = parse_date(event["date"])
        day_diff = (event_date - today).days
        if 0 <= day_diff < 7:
            day_key = f"Day {day_diff} ({(today + datetime.timedelta(days=day_diff)).isoformat()})"
            # Use pre-computed signed tax from the service
            tax = event.get("mental_tax", 0.0)
            start_hour = event.get("start_hour")
            if start_hour is None:
                try:
                    event_dt = datetime.datetime.fromisoformat(event["date"].replace("Z", "+00:00"))
                    start_hour = event_dt.hour
                except Exception:
                    start_hour = work_start
            optimized_week[day_key].tasks.append(OptimizedTaskItem(
                source=event.get("source", "Google Calendar"),
                title=event["title"],
                mental_tax=round(tax, 2),
                is_fixed=True,
                start_hour=start_hour
            ))
            daily_task_buckets[day_key].append({
                "duration": event["duration"],
                "mental_tax": tax,
                "type": event["type"],
                "start_hour": start_hour,
            })
            
    # Add flexible Flux tasks
    for t in flexible_tasks:
        day_index = schedule_mapping.get(t["id"])
        if day_index is not None:
            day_key = f"Day {day_index} ({(today + datetime.timedelta(days=day_index)).isoformat()})"
            optimized_week[day_key].tasks.append(OptimizedTaskItem(
                source="Flux",
                title=t["title"],
                mental_tax=round(t["mental_tax"], 2),
                is_fixed=False
            ))
            optimized_week[day_key].total_load += t["mental_tax"]
            daily_task_buckets[day_key].append({
                "duration": t["duration"],
                "mental_tax": t["mental_tax"],
                "type": t["type"]
            })

    # Build decompression breaks PER DAY when mode is active
    if decompress:
        for day_key in optimized_week:
            tasks_in_day = optimized_week[day_key].tasks
            if not tasks_in_day:
                continue
            # Convert OptimizedTaskItem to dicts, sorted by start_hour
            task_dicts = sorted(
                [{"title": t.title, "duration": 1.0, "type": "Deep Work",
                  "mental_tax": t.mental_tax, "start_hour": t.start_hour,
                  "is_fixed": t.is_fixed, "source": t.source}
                 for t in tasks_in_day],
                key=lambda x: (x.get("start_hour") or 9)
            )
            enriched = build_decompression_breaks(task_dicts, work_start, work_end)
            new_task_items = []
            for td in enriched:
                new_task_items.append(OptimizedTaskItem(
                    source=td.get("source", "Flux"),
                    title=td["title"],
                    mental_tax=td["mental_tax"],
                    is_fixed=td.get("is_fixed", False),
                    start_hour=td.get("start_hour")
                ))
                daily_task_buckets[day_key].append({
                    "duration": td.get("duration", 0.25),
                    "mental_tax": td["mental_tax"],
                    "type": td.get("type", "Break"),
                    "start_hour": td.get("start_hour")
                })
            optimized_week[day_key].tasks = new_task_items

    # Generate hourly load curves per day; floor total_load at 0.0
    for day_key, daily_sch in optimized_week.items():
        tasks_for_day = daily_task_buckets.get(day_key, [])
        # Recalculate total from bucket (includes break credits)
        raw_total = sum(t.get("mental_tax", 0) for t in tasks_for_day)
        daily_sch.total_load = round(max(0.0, raw_total), 2)
        daily_sch.hourly_load = get_hourly_load_curve(
            tasks_for_day,
            chronotype=chronotype,
            work_start=work_start,
            work_end=work_end,
            base_capacity=base_capacity
        )

    real_max = max((v.total_load for v in optimized_week.values()), default=0.0)
    return OptimizedWeekResponse(
        max_daily_load=round(real_max, 2),
        is_overloaded=(real_max > base_capacity),
        base_capacity=base_capacity,
        schedule=optimized_week
    )


@router.get("/syllabi")
async def get_syllabi(current_user: dict = Depends(get_current_user)):
    """Returns all syllabi the user has uploaded, from the mongo 'syllabi' collection."""
    import datetime
    db = get_db()
    if db is None:
        return {"syllabi": []}
    cursor = db.syllabi.find({"user_id": str(current_user["_id"])}).sort("uploaded_at", -1)
    syllabi = await cursor.to_list(length=50)
    result = []
    for s in syllabi:
        result.append({
            "id": str(s["_id"]),
            "filename": s.get("filename", "Unnamed"),
            "uploaded_at": s["uploaded_at"].isoformat() if isinstance(s.get("uploaded_at"), datetime.datetime) else str(s.get("uploaded_at", "")),
            "task_count": s.get("task_count", 0),
            "skipped_count": s.get("skipped_count", 0),
        })
    return {"syllabi": result}


@router.get("/recommendations")
async def get_recommendations(current_user: dict = Depends(get_current_user)):
    """Returns AI-generated recommendations based on user profile + current schedule."""
    import datetime
    from app.services.google_calendar import fetch_events_next_7_days
    from app.services.optimizer import balance_schedule
    
    today = datetime.datetime.utcnow().date()
    chronotype = current_user.get("chronotype", "neutral")
    base_capacity = float(current_user.get("base_capacity", 8.0))
    work_start = int(current_user.get("work_start_hour", 8))
    work_end = int(current_user.get("work_end_hour", 20))
    
    # Build a lightweight schedule snapshot
    gcal_events = fetch_events_next_7_days()
    fixed_load = [0.0] * 7
    for event in gcal_events:
        try:
            event_date = datetime.datetime.fromisoformat(
                event["date"].replace("Z", "+00:00")
            ).date()
            day_diff = (event_date - today).days
            if 0 <= day_diff < 7:
                tax, _ = calculate_mental_tax(event["duration"], event["type"], None)
                fixed_load[day_diff] += tax
        except Exception:
            pass
    
    db = get_db()
    flux_tasks = []
    if db is not None:
        cursor = db.tasks.find({"user_id": str(current_user["_id"])})
        flux_tasks = await cursor.to_list(length=100)
    
    flexible = []
    for t in flux_tasks:
        tax, _ = calculate_mental_tax(t.get("duration", 1.0), t.get("type", "Admin"), None)
        flexible.append({
            "id": str(t["_id"]),
            "title": t.get("title", "Untitled"),
            "duration": t.get("duration", 1.0),
            "type": t.get("type", "Admin"),
            "mental_tax": tax
        })
    
    schedule_mapping, max_load = balance_schedule(flexible, fixed_load)
    
    # Build a lightweight schedule dict for the recommender
    simple_schedule = {}
    for i, load in enumerate(fixed_load):
        day_key = f"Day {i}"
        simple_schedule[day_key] = {"total_load": load, "tasks": []}
    for t in flexible:
        idx = schedule_mapping.get(t["id"])
        if idx is not None:
            simple_schedule[f"Day {idx}"]["tasks"].append(t)
    
    recs = generate_recommendations(
        user=current_user,
        schedule=simple_schedule,
        max_daily_load=max_load or 0.0
    )
    return {"recommendations": recs, "base_capacity": base_capacity, "chronotype": chronotype}


# ─── Task Creation ─────────────────────────────────────────────────────────────

class TaskCreateInput(BaseModel):
    title: str
    duration: float
    type: str
    date: Optional[str] = None       # ISO date string e.g. "2026-03-08"
    location: Optional[str] = None
    priority: Optional[str] = "medium"  # low | medium | high

@router.post("/tasks/create")
async def create_task(
    task: TaskCreateInput,
    current_user: dict = Depends(get_current_user)
):
    """Creates a task in MongoDB and mirrors it as a mock GCal event."""
    import datetime
    from app.services.google_calendar import create_event

    user_id = str(current_user["_id"])
    tax, _ = calculate_mental_tax(task.duration, task.type)

    # Resolve due_date
    if task.date:
        try:
            due_date = datetime.datetime.fromisoformat(task.date.replace("Z", "+00:00"))
        except Exception:
            due_date = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    else:
        due_date = datetime.datetime.utcnow() + datetime.timedelta(days=1)

    task_doc = {
        "title": task.title,
        "duration": task.duration,
        "type": task.type,
        "cognitive_weight": tax / max(task.duration, 0.01),
        "due_date": due_date,
        "location": task.location or "",
        "priority": task.priority or "medium",
        "mental_tax": round(tax, 2),
        "user_id": user_id,
    }
    db = get_db()
    result = await db.tasks.insert_one(task_doc)

    # Also create a corresponding mock GCal event
    gcal_event = create_event(
        title=task.title,
        date=due_date.isoformat(),
        duration=task.duration,
        event_type=task.type,
        location=task.location or "",
        priority=task.priority or "medium"
    )

    return {
        "id": str(result.inserted_id),
        "title": task.title,
        "duration": task.duration,
        "type": task.type,
        "mental_tax": round(tax, 2),
        "date": due_date.isoformat(),
        "location": task.location or "",
        "priority": task.priority or "medium",
        "gcal_event": gcal_event
    }


# ─── Google Calendar Events ────────────────────────────────────────────────────

@router.get("/gcal/events")
async def get_gcal_events(current_user: dict = Depends(get_current_user)):
    """
    Returns the enriched Google Calendar events for the next 7 days,
    each tagged with a mental_tax value computed from duration and task type.
    """
    from app.services.google_calendar import fetch_events_next_7_days
    events = fetch_events_next_7_days()
    return {"events": events, "count": len(events)}

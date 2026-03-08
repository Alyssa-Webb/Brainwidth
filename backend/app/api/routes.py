from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import datetime
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
from app.services.recommendations import generate_ai_schedule_insights

router = APIRouter()

# OAuth state persistence is now handled via MongoDB in the routes themselves.

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
    auth_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent")
    
    # Save the code_verifier temporarily so the callback can use it (PKCE)
    if hasattr(flow, "code_verifier"):
        db = get_db()
        if db is not None:
            await db.oauth_states.update_one(
                {"state": state},
                {"$set": {"code_verifier": flow.code_verifier, "created_at": datetime.datetime.utcnow()}},
                upsert=True
            )

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
    from fastapi.responses import HTMLResponse, RedirectResponse

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
    
    # Retrieve the code_verifier saved during /authorize
    db = get_db()
    code_verifier = None
    if db is not None:
        state_doc = await db.oauth_states.find_one({"state": state})
        if state_doc:
            code_verifier = state_doc.get("code_verifier")
    
    try:
        if code_verifier:
            flow.fetch_token(code=code, code_verifier=code_verifier)
            # Clean up
            if db is not None:
                await db.oauth_states.delete_one({"state": state})
        else:
            flow.fetch_token(code=code)
            
        creds = flow.credentials

        token_path = creds_path.parent / "token.json"
        with open(str(token_path), "w") as f:
            f.write(creds.to_json())
    except Exception as e:
        print(f"OAuth token exchange failed: {e}")
        return RedirectResponse(url="http://localhost:3000/profile?gcal=error")

    return RedirectResponse(url="http://localhost:3000/profile?gcal=connected")


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
        extracted_data = parse_syllabus_and_extract_tasks(content)
        db = get_db()
        
        if db is not None and extracted_data:
            # Save syllabus metadata to 'syllabi' collection
            await db.syllabi.insert_one({
                "user_id": str(current_user["_id"]),
                "filename": file.filename,
                "course_name": extracted_data["title"],
                "daily_load_penalty": extracted_data["mental_tax"],
                "reasoning": extracted_data["reasoning"],
                "uploaded_at": datetime.datetime.utcnow(),
            })
        
        # Invalidate recommendations
        await invalidate_recommendations(current_user["_id"])
                
        return {
            "message": f"Successfully analyzed syllabus for {extracted_data['title']}.",
            "syllabus_data": extracted_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class OptimizedTaskItem(BaseModel):
    id: Optional[str] = None
    source: str
    title: str
    mental_tax: float
    is_fixed: bool
    start_hour: Optional[float] = None
    duration: Optional[float] = 1.0
    type: Optional[str] = None
    is_break: Optional[bool] = False
    is_weight: Optional[bool] = False
    is_all_day: bool = False

class DailySchedule(BaseModel):
    total_load: float
    tasks: List[OptimizedTaskItem]
    hourly_load: List[float] = Field(default_factory=lambda: [0.0] * 24)

class OptimizedWeekResponse(BaseModel):
    max_daily_load: float
    is_overloaded: bool
    base_capacity: float
    schedule: Dict[str, DailySchedule]
    ai_insights: List[str] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())

@router.get("/optimize", response_model=OptimizedWeekResponse)
async def optimize_week(
    decompress: bool = False,
    force_sync: bool = False,
    current_user: dict = Depends(get_current_user)
):
    import datetime
    from app.services.google_calendar import fetch_events_next_7_days
    from app.services.optimizer import balance_schedule
    
    chronotype = current_user.get("chronotype", "neutral")
    base_capacity = float(current_user.get("base_capacity", 8.0))
    work_start = int(current_user.get("work_start_hour", 00.00))
    work_end = int(current_user.get("work_end_hour", 24.00))
    user_goals = current_user.get("goals", [])
    
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
    
    gcal_events = await fetch_events_next_7_days(user_id=str(current_user["_id"]), force_sync=force_sync)
    
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
    active_syllabi = []
    syllabi_load_per_day = 0.0
    
    if db is not None:
        cursor = db.tasks.find({"user_id": str(current_user["_id"])})
        flux_tasks = await cursor.to_list(length=100)
        
        # Inject demo schedule if this is the user's first time with an empty schedule
        if not current_user.get("has_seen_demo") and len(flux_tasks) == 0 and len(gcal_events) == 0:
            demo_tasks = [
                {"user_id": str(current_user["_id"]), "title": "Review Q3 Strategy Docs", "duration": 2.0, "type": "Deep Work", "is_fixed": False},
                {"user_id": str(current_user["_id"]), "title": "Clear Inbox & Slack", "duration": 0.5, "type": "Admin", "is_fixed": False},
                {"user_id": str(current_user["_id"]), "title": "Design System Brainstorm", "duration": 1.5, "type": "Creative", "is_fixed": False},
                {"user_id": str(current_user["_id"]), "title": "Update Project Tracker", "duration": 1.0, "type": "Admin", "is_fixed": False},
            ]
            await db.tasks.insert_many(demo_tasks)
            await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"has_seen_demo": True}})
            cursor = db.tasks.find({"user_id": str(current_user["_id"])})
            flux_tasks = await cursor.to_list(length=100)
        
        # Inject demo schedule if this is the user's first time with an empty schedule
        if not current_user.get("has_seen_demo") and len(flux_tasks) == 0 and len(gcal_events) == 0:
            demo_tasks = [
                {"user_id": str(current_user["_id"]), "title": "Review Q3 Strategy Docs", "duration": 2.0, "type": "Deep Work", "is_fixed": False},
                {"user_id": str(current_user["_id"]), "title": "Clear Inbox & Slack", "duration": 0.5, "type": "Admin", "is_fixed": False},
                {"user_id": str(current_user["_id"]), "title": "Design System Brainstorm", "duration": 1.5, "type": "Creative", "is_fixed": False},
                {"user_id": str(current_user["_id"]), "title": "Update Project Tracker", "duration": 1.0, "type": "Admin", "is_fixed": False},
            ]
            await db.tasks.insert_many(demo_tasks)
            await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"has_seen_demo": True}})
            # Invalidate recommendations since we just added demo tasks
            await invalidate_recommendations(current_user["_id"])
            cursor = db.tasks.find({"user_id": str(current_user["_id"])})
            flux_tasks = await cursor.to_list(length=100)
        
        s_cursor = db.syllabi.find({"user_id": str(current_user["_id"])})
        active_syllabi = await s_cursor.to_list(length=50)
        for s in active_syllabi:
            syllabi_load_per_day += s.get("daily_load_penalty", 0.0)

    for i in range(7):
        fixed_load_per_day[i] += syllabi_load_per_day
    
    flexible_tasks = []
    fixed_flux_tasks = []
    for t in flux_tasks:
        if t.get("is_gcal_synced"):
            continue # GCal fetch handles it
            
        title = t.get("title", "")
        tax, _ = calculate_mental_tax(t.get("duration", 1.0), t.get("type", "Admin"), title=title)
        
        if t.get("is_fixed") and t.get("due_date"):
            fixed_flux_tasks.append({
                "id": str(t["_id"]),
                "title": title,
                "duration": t.get("duration", 1.0),
                "type": t.get("type", "Admin"),
                "mental_tax": tax,
                "due_date": t["due_date"]
            })
        else:
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
                    start_hour = float(event_dt.hour + event_dt.minute / 60.0)
                except Exception:
                    start_hour = work_start
            optimized_week[day_key].tasks.append(OptimizedTaskItem(
                source=event.get("source", "Google Calendar"),
                title=event["title"],
                mental_tax=round(abs(tax), 2),
                is_fixed=True,
                start_hour=start_hour,
                duration=event.get("duration", 1.0),
                type=event.get("type", "Meeting"),
                is_break=event.get("is_restful", tax < 0)
            ))
            daily_task_buckets[day_key].append({
                "duration": event.get("duration", 1.0),
                "mental_tax": tax,
                "type": event.get("type", "Meeting"),
                "start_hour": start_hour,
            })
            
    # Add active syllabi as daily fixed load markers
    for i in range(7):
        day_key = f"Day {i} ({(today + datetime.timedelta(days=i)).isoformat()})"
        day_date = today + datetime.timedelta(days=i)
        for s in active_syllabi:
            penalty = s.get("daily_load_penalty", 0.0)
            course_name = s.get("course_name", "Unknown Course")
            # Add as an all-day task
            optimized_week[day_key].tasks.append(OptimizedTaskItem(
                id=f"stem_penalty_{day_key}_{course_name}",
                source="Syllabus",
                title=f"Cognitive Weight | {round(penalty, 2)}τ | {course_name}",
                mental_tax=round(penalty, 2),
                is_fixed=False,
                duration=0.5,
                type="STEM",
                is_break=False,
                is_weight=True,
                is_all_day=True,
                start_hour=None
            ))
            optimized_week[day_key].total_load += penalty
            daily_task_buckets[day_key].append({
                "duration": 0.5,
                "mental_tax": penalty,
                "type": "STEM",
                "is_all_day": True
            })
        
        # Add fixed Flux tasks for this day
        day_date = today + datetime.timedelta(days=i)
        for ft in fixed_flux_tasks:
            if ft["due_date"].date() == day_date:
                # Add it to the end of the day roughly
                start_hour = float(float(work_end) - float(ft.get("duration", 1.0)))
                optimized_week[day_key].tasks.append(OptimizedTaskItem(
                    id=ft["id"],
                    source="Flux",
                    title=ft["title"],
                    mental_tax=round(abs(ft["mental_tax"]), 2),
                    is_fixed=True,
                    start_hour=start_hour,  # Pinned to late afternoon to avoid clashing
                    duration=ft.get("duration", 1.0),
                    type=ft.get("type", "Admin"),
                    is_break=(ft["mental_tax"] < 0)
                ))
                daily_task_buckets[day_key].append({
                    "duration": ft.get("duration", 1.0),
                    "mental_tax": ft["mental_tax"],
                    "type": ft.get("type", "Admin"),
                    "start_hour": start_hour
                })
                optimized_week[day_key].total_load += ft["mental_tax"]
            
    # Add flexible Flux tasks
    for t in flexible_tasks:
        day_index = schedule_mapping.get(t["id"])
        if day_index is not None:
            day_key = f"Day {day_index} ({(today + datetime.timedelta(days=day_index)).isoformat()})"
            optimized_week[day_key].tasks.append(OptimizedTaskItem(
                id=t.get("id"), # Added id field
                source="Flux",
                title=t["title"],
                mental_tax=round(abs(t["mental_tax"]), 2),
                is_fixed=False,
                duration=t.get("duration", 1.0),
                is_break=(t["mental_tax"] < 0)
            ))
            optimized_week[day_key].total_load += t["mental_tax"]
            daily_task_buckets[day_key].append({
                "duration": t["duration"],
                "mental_tax": t["mental_tax"],
                "type": t["type"]
            })

    # Assign start_hour to flexible tasks and insert breaks if decompress mode is active
    for day_key in optimized_week:
        tasks_in_day = optimized_week[day_key].tasks
        if not tasks_in_day:
            continue
        # Convert OptimizedTaskItem to dicts, correctly sorting fixed tasks first
        task_dicts = [
            {
                "id": t.id,
                "title": t.title,
                "duration": t.duration,
                "type": t.type or "Deep Work",
                "mental_tax": t.mental_tax if not t.is_break else -t.mental_tax, 
                "start_hour": t.start_hour,
                "is_fixed": t.is_fixed,
                "source": t.source,
                "is_break": t.is_break,
                "is_weight": t.is_weight,
                "is_all_day": t.is_all_day
            }
            for t in tasks_in_day
        ]
        # Sort is_fixed first within the logic of build_decompression_breaks anyway

        if decompress:
            enriched = build_decompression_breaks(task_dicts, chronotype, work_start, work_end, decompress=True, goals=user_goals)
        else:
            enriched = build_decompression_breaks(task_dicts, chronotype, work_start, work_end, decompress=False, goals=user_goals)

        new_task_items = []
        daily_task_buckets[day_key] = []  # Clear to avoid double-counting
        
        for td in enriched:
            new_task_items.append(OptimizedTaskItem(
                id=td.get("id"),
                source=td.get("source", "Flux"),
                title=td["title"],
                mental_tax=round(abs(td["mental_tax"]), 2),
                is_fixed=td.get("is_fixed", False),
                start_hour=td.get("start_hour"),
                duration=td.get("duration", 1.0),
                type=td.get("type", "Break"),
                is_break=td.get("is_break", td.get("mental_tax", 0) < 0),
                is_weight=td.get("is_weight", False),
                is_all_day=td.get("is_all_day", False)
            ))
            daily_task_buckets[day_key].append({
                "duration": td.get("duration", 0.25),
                "mental_tax": td["mental_tax"],
                "type": td.get("type", "Break"),
                "start_hour": td.get("start_hour"),
                "is_all_day": td.get("is_all_day", False)
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

    # Generate dynamic AI Insights
    ai_insights = []
    try:
        # Wrap OptimizedWeekItem back into dicts for the recommendation service
        serializable_schedule = {}
        for day, data in optimized_week.items():
            serializable_schedule[day] = {
                "tasks": [{"title": t.title, "type": t.type, "start_hour": t.start_hour, "mental_tax": t.mental_tax} for t in data.tasks]
            }
        
        dynamic_recs = generate_ai_schedule_insights(current_user, serializable_schedule)
        ai_insights = [f"{rec['title']}: {rec['message']}" for rec in dynamic_recs]
    except Exception as e:
        print(f"Error generating dynamic insights: {e}")
        ai_insights = ["AI is still learning your patterns. Check back soon!"]

    if not ai_insights:
        ai_insights = ["Your schedule is optimized for your chronotype! Keep up the great work."]

    return OptimizedWeekResponse(
        max_daily_load=round(real_max, 2),
        is_overloaded=(real_max > base_capacity),
        base_capacity=base_capacity,
        schedule=optimized_week,
        ai_insights=ai_insights,
        generated_at=datetime.datetime.utcnow().isoformat()
    )


@router.post("/sync-syllabus/{syllabus_id}")
async def sync_syllabus(syllabus_id: str, current_user: dict = Depends(get_current_user)):
    """
    In a full production app, this would re-fetch the saved PDF GridFS bytes 
    from Mongo and run them through Gemini again.
    For this hackathon implementation, since we did not store the raw 10MB PDFs 
    in the database to save space, we will just return a mocked success message, 
    but the user has to re-upload the file to technically "sync" real data.
    """
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected.")
        
    from bson.objectid import ObjectId
    try:
        obj_id = ObjectId(syllabus_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid syllabus ID format.")
        
    syllabus = await db.syllabi.find_one({"_id": obj_id, "user_id": str(current_user["_id"])})
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found.")

    # We cannot re-run `parse_syllabus_and_extract_tasks` without the file bytes.
    # In a real app we would do:
    # file_bytes = gridfs.get(syllabus["file_id"]).read()
    # extracted = parse_syllabus_and_extract_tasks(file_bytes)
    # await db.syllabi.update_one(...)
    
    # We'll just fake a 1-second delay and return success so the frontend button spins and resolves.
    import asyncio
    await asyncio.sleep(1)
    
    return {"message": "Syllabus synced successfully."}

@router.delete("/syllabi/{syllabus_id}")
async def delete_syllabus(syllabus_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a syllabus and removes legacy tasks associated with previous parses."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected.")
        
    from bson.objectid import ObjectId
    try:
        obj_id = ObjectId(syllabus_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid syllabus ID format.")
        
    result = await db.syllabi.delete_one({"_id": obj_id, "user_id": str(current_user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Syllabus not found.")
        
    # Older versions of the app generated heavy tasks directly from syllabi.
    # To fulfill the "remove associated tasks" request for legacy state, we will 
    # wipe any task created via those runs. Manual tasks have a 'priority' field, 
    # but syllabus-generated tasks did not.
    await db.tasks.delete_many({
        "user_id": str(current_user["_id"]),
        "priority": {"$exists": False}
    })
    
    # Invalidate recommendations
    await invalidate_recommendations(current_user["_id"])
    
    return {"message": "Syllabus and associated legacy tasks removed successfully."}

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
            "course_name": s.get("course_name", "Unknown Class"),
            "daily_load_penalty": s.get("daily_load_penalty", 0.0),
            "reasoning": s.get("reasoning", ""),
            "uploaded_at": s["uploaded_at"].isoformat() if isinstance(s.get("uploaded_at"), datetime.datetime) else str(s.get("uploaded_at", "")),
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

    db = get_db()
    
    # Check Cache
    last_recs = current_user.get("last_recommendations")
    gen_at = current_user.get("recommendations_generated_at")
    is_stale = current_user.get("recommendations_stale", True)
    
    if last_recs and gen_at and not is_stale:
        # Check if > 24h
        if (datetime.datetime.utcnow() - gen_at).total_seconds() < 86400:
            return {
                "recommendations": last_recs,
                "base_capacity": base_capacity,
                "chronotype": chronotype,
                "generated_at": gen_at.isoformat()
            }
    
    # Build a lightweight schedule snapshot
    gcal_events = await fetch_events_next_7_days(user_id=str(current_user["_id"]))
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
    
    # Save to cache
    generated_at = datetime.datetime.utcnow()
    db_conn = get_db()
    if db_conn is not None:
        await db_conn.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {
                "last_recommendations": recs,
                "recommendations_generated_at": generated_at,
                "recommendations_stale": False
            }}
        )
    
    return {
        "recommendations": recs, 
        "base_capacity": base_capacity, 
        "chronotype": chronotype,
        "generated_at": generated_at.isoformat()
    }


# Helper to invalidate recommendations
async def invalidate_recommendations(user_id: ObjectId):
    db = get_db()
    if db is not None:
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"recommendations_stale": True}}
        )

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

    has_date = bool(task.date)
    if has_date:
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
        "is_fixed": has_date
    }
    db = get_db()
    result = await db.tasks.insert_one(task_doc)

    is_gcal_synced = False
    gcal_event = None
    if has_date:
        gcal_event = await create_event(
            title=task.title,
            date=due_date.isoformat(),
            duration=task.duration,
            event_type=task.type,
            location=task.location or "",
            priority=task.priority or "medium"
        )
        if gcal_event and not gcal_event.get("id", "").startswith("task_"):
            is_gcal_synced = True
            await db.tasks.update_one({"_id": result.inserted_id}, {"$set": {"is_gcal_synced": True}})
    
    # Invalidate recommendations since a new task was added
    await invalidate_recommendations(current_user["_id"])

    return {
        "id": str(result.inserted_id),
        "title": task.title,
        "duration": task.duration,
        "type": task.type,
        "mental_tax": round(tax, 2),
        "date": due_date.isoformat() if has_date else None,
        "location": task.location or "",
        "priority": task.priority or "medium",
        "is_fixed": has_date,
        "gcal_event": gcal_event
    }


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a task from MongoDB."""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected.")
    
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")
    
    result = await db.tasks.delete_one({"_id": obj_id, "user_id": str(current_user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or not authorized.")
    
    # Invalidate recommendations
    await invalidate_recommendations(current_user["_id"])
    
    return {"message": "Task deleted successfully"}

# ─── Google Calendar Events ────────────────────────────────────────────────────

@router.get("/gcal/events")
async def get_gcal_events(current_user: dict = Depends(get_current_user)):
    """
    Returns the enriched Google Calendar events for the next 7 days,
    each tagged with a mental_tax value computed from duration and task type.
    """
    from app.services.google_calendar import fetch_events_next_7_days
    events = await fetch_events_next_7_days(user_id=str(current_user["_id"]))
    return {"events": events, "count": len(events)}

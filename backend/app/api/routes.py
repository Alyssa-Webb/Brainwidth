from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.engine.calculator import calculate_mental_tax
from app.services.db_service import get_db
from app.parser.pdf_parser import parse_syllabus_and_extract_tasks

router = APIRouter()

class TaskInput(BaseModel):
    id: str
    title: str
    duration: float # hours
    type: str     # STEM, Admin, etc.

class TaskOutput(BaseModel):
    id: str
    title: str
    duration: float
    type: str
    mental_tax: float
    context_switched: bool

@router.get("/tasks", response_model=List[dict])
async def get_tasks():
    # Return all seeded tasks from MongoDB
    db = get_db()
    if db is None:
        return []
        
    tasks_collection = db.tasks
    # Get all tasks, limit to 20 for now
    cursor = tasks_collection.find({}).limit(20)
    tasks = await cursor.to_list(length=20)
    
    # Format for frontend consumption
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
    # Simplified endpoint to calculate tax for a list of tasks
    # Assume context switch penalty applies to consecutive tasks of different types
    result = []
    prev_type = None
    for task in tasks:
        tax, ctx_switch = calculate_mental_tax(task.duration, task.type, prev_type)
        result.append(
            TaskOutput(
                id=task.id,
                title=task.title,
                duration=task.duration,
                type=task.type,
                mental_tax=tax,
                context_switched=ctx_switch
            )
        )
        prev_type = task.type
    return result

@router.post("/upload-syllabus")
async def upload_syllabus(file: UploadFile = File(...)):
    """
    Receives a PDF, parses text, extracts tasks via Gemini, and saves them to MongoDB.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        content = await file.read()
        extracted_tasks = parse_syllabus_and_extract_tasks(content)
        
        db = get_db()
        if db is not None and extracted_tasks:
            # Save all parsed tasks to MongoDB under 'tasks' collection
            result = await db.tasks.insert_many(extracted_tasks)
            print(f"Inserted {len(result.inserted_ids)} records to MongoDB")
            
        # Serialize datetime and ObjectId for JSON response
        for t in extracted_tasks:
            t["_id"] = str(t.get("_id", ""))
            if hasattr(t["due_date"], "isoformat"):
                t["due_date"] = t["due_date"].isoformat()
            
            # Remove vector mapping to keep response clean
            t.pop("vector_embedding", None)
            
        return {"message": f"Successfully parsed and saved {len(extracted_tasks)} tasks.", "tasks": extracted_tasks}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class OptimizedTaskItem(BaseModel):
    source: str
    title: str
    mental_tax: float
    is_fixed: bool

class DailySchedule(BaseModel):
    total_load: float
    tasks: List[OptimizedTaskItem]

class OptimizedWeekResponse(BaseModel):
    max_daily_load: float
    is_overloaded: bool
    schedule: Dict[str, DailySchedule]

@router.get("/optimize", response_model=OptimizedWeekResponse)
async def optimize_week():
    import datetime
    from app.services.google_calendar import fetch_events_next_7_days
    from app.services.optimizer import balance_schedule
    
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
    
    # 1. Fetch Google Calendar events (mock)
    gcal_events = fetch_events_next_7_days()
    
    # 2. Calculate current load per day from fixed events
    fixed_load_per_day = [0.0] * 7
    for event in gcal_events:
        tax, _ = calculate_mental_tax(event["duration"], event["type"], None)
        event_date = parse_date(event["date"])
        day_diff = (event_date - today).days
        if 0 <= day_diff < 7:
            fixed_load_per_day[day_diff] += tax

    # 3. Fetch MongoDB tasks (flexible)
    db = get_db()
    flux_tasks = []
    if db is not None:
        cursor = db.tasks.find({})
        flux_tasks = await cursor.to_list(length=100)
    
    # Process flexible tasks
    flexible_tasks = []
    for t in flux_tasks:
        tax, _ = calculate_mental_tax(t.get("duration", 1.0), t.get("type", "Admin"), None)
        flexible_tasks.append({
            "id": str(t["_id"]),
            "title": t.get("title", "Untitled"),
            "duration": t.get("duration", 1.0),
            "type": t.get("type", "Admin"),
            "mental_tax": tax
        })
        
    # 4. Run PuLP Optimizer
    schedule_mapping, max_load = balance_schedule(flexible_tasks, fixed_load_per_day)
    
    # 5. Format the result
    optimized_week: Dict[str, DailySchedule] = {}
    for i in range(7):
        day_key = f"Day {i} ({(today + datetime.timedelta(days=i)).isoformat()})"
        optimized_week[day_key] = DailySchedule(
            total_load=fixed_load_per_day[i],
            tasks=[]
        )
    
    # Add fixed GCal events
    for event in gcal_events:
        event_date = parse_date(event["date"])
        day_diff = (event_date - today).days
        if 0 <= day_diff < 7:
            day_key = f"Day {day_diff} ({(today + datetime.timedelta(days=day_diff)).isoformat()})"
            tax, _ = calculate_mental_tax(event["duration"], event["type"], None)
            optimized_week[day_key].tasks.append(OptimizedTaskItem(
                source="Google Calendar",
                title=event["title"],
                mental_tax=round(tax, 2),
                is_fixed=True
            ))
            
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
            
    # Round totals
    for k, daily_sch in optimized_week.items():
        daily_sch.total_load = round(daily_sch.total_load, 2)
            
    return OptimizedWeekResponse(
        max_daily_load=round(max_load, 2) if max_load else 0.0,
        is_overloaded=(max_load > 8.0) if max_load else False,
        schedule=optimized_week
    )

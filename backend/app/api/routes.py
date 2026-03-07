from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional

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

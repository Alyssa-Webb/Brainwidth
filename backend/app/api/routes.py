from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.engine.calculator import calculate_mental_tax

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

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TaskModel(BaseModel):
    title: str
    due_date: datetime
    cognitive_weight: float
    duration: Optional[float] = None
    type: Optional[str] = None
    vector_embedding: List[float] = Field(default_factory=lambda: [0.0] * 1536)

class TaskResponse(TaskModel):
    id: str

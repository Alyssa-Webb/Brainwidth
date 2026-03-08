from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

class TaskModel(BaseModel):
    title: str
    due_date: datetime
    cognitive_weight: float
    duration: Optional[float] = None
    type: Optional[str] = None
    vector_embedding: List[float] = Field(default_factory=lambda: [0.0] * 1536)
    user_id: Optional[str] = None

class TaskResponse(TaskModel):
    id: str

# Authentication Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

# Chronotype options
CHRONOTYPE_OPTIONS = ["lion", "bear", "wolf", "night_owl", "dolphin"]

class UserProfile(BaseModel):
    """Extended user profile for personalized scheduling"""
    chronotype: Optional[str] = "bear"        # lion | bear | wolf | night_owl | dolphin
    work_start_hour: Optional[int] = 8            # e.g. 8 = 8am
    work_end_hour: Optional[int] = 20             # e.g. 20 = 8pm
    base_capacity: Optional[float] = 8.0         # max cognitive load per day
    goals: Optional[List[str]] = Field(default_factory=list)

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    chronotype: Optional[str] = None
    work_start_hour: Optional[int] = None
    work_end_hour: Optional[int] = None
    base_capacity: Optional[float] = None
    goals: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    chronotype: Optional[str] = "bear"
    work_start_hour: Optional[int] = 8
    work_end_hour: Optional[int] = 20
    base_capacity: Optional[float] = 8.0
    goals: Optional[List[str]] = Field(default_factory=list)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

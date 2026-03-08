from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from bson import ObjectId
from ..models.schemas import UserCreate, UserResponse, Token, UserProfileUpdate
from ..core.security import verify_password, get_password_hash, create_access_token
from ..services.db_service import get_db
from ..api.deps import get_current_user

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
async def signup(user: UserCreate, db: Any = Depends(get_db)):
    collection = db.users
    existing_user = await collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    # Set profile defaults
    user_dict.setdefault("chronotype", "bear")
    user_dict.setdefault("work_start_hour", 8)
    user_dict.setdefault("work_end_hour", 20)
    user_dict.setdefault("base_capacity", 8.0)
    user_dict.setdefault("goals", [])
    
    result = await collection.insert_one(user_dict)
    return {
        "id": str(result.inserted_id),
        "email": user.email,
        "name": user.name,
        "chronotype": user_dict["chronotype"],
        "work_start_hour": user_dict["work_start_hour"],
        "work_end_hour": user_dict["work_end_hour"],
        "base_capacity": user_dict["base_capacity"],
        "goals": user_dict["goals"]
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Any = Depends(get_db)):
    collection = db.users
    user = await collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=str(user["_id"]))
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Returns the full user profile of the currently logged-in user."""
    return {
        "id": str(current_user["_id"]),
        "email": current_user.get("email", ""),
        "name": current_user.get("name", ""),
        "chronotype": current_user.get("chronotype", "neutral"),
        "work_start_hour": current_user.get("work_start_hour", 8),
        "work_end_hour": current_user.get("work_end_hour", 20),
        "base_capacity": current_user.get("base_capacity", 8.0),
        "goals": current_user.get("goals", [])
    }

@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_db)
):
    """Updates the user's profile fields (chronotype, capacity, goals, etc.)."""
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["recommendations_stale"] = True
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    # Return updated doc
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "id": str(updated["_id"]),
        "email": updated.get("email", ""),
        "name": updated.get("name", ""),
        "chronotype": updated.get("chronotype", "neutral"),
        "work_start_hour": updated.get("work_start_hour", 8),
        "work_end_hour": updated.get("work_end_hour", 20),
        "base_capacity": updated.get("base_capacity", 8.0),
        "goals": updated.get("goals", [])
    }

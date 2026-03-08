import asyncio
import os
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from app.core.security import get_password_hash

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "flux_db")

def mock_embedding():
    # Helper to generate a dummy 1536-dimensional embedding
    return [random.uniform(-1, 1) for _ in range(1536)]

async def seed_db():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    users_collection = db.users
    tasks_collection = db.tasks
    
    # Optional: Clear existing records before seeding
    await users_collection.delete_many({})
    await tasks_collection.delete_many({})
    print("Cleared existing users and tasks.")
    
    # 1. Create Default User with full profile
    default_user = {
        "email": "test@test.com",
        "name": "Alyssa",
        "hashed_password": get_password_hash("password"),
        # Phase 6 profile fields
        "chronotype": "bear",          # Alyssa is a bear (follows the sun)
        "work_start_hour": 8,
        "work_end_hour": 20,
        "base_capacity": 9.0,            # slightly above average
        "goals": [
            "Finish thesis by April",
            "Avoid back-to-back deep work blocks",
            "Exercise at least 3x a week"
        ]
    }
    user_result = await users_collection.insert_one(default_user)
    user_id = str(user_result.inserted_id)
    print(f"Created default user Alyssa with ID: {user_id}")

    
    now = datetime.utcnow()
    
    tasks = [
        # 2 High-Tax Tasks
        {
            "title": "Math midterm prep",
            "due_date": now + timedelta(days=2),
            "cognitive_weight": 0.9,
            "duration": 3.0,
            "type": "STEM",
            "vector_embedding": mock_embedding(),
            "createdAt": now,
            "user_id": user_id
        },
        {
            "title": "Physics assignment",
            "due_date": now + timedelta(days=3),
            "cognitive_weight": 0.85,
            "duration": 2.0,
            "type": "STEM",
            "vector_embedding": mock_embedding(),
            "createdAt": now,
            "user_id": user_id
        },
        # 3 Low-Tax Tasks
        {
            "title": "Reply to emails",
            "due_date": now + timedelta(days=1),
            "cognitive_weight": 0.3,
            "duration": 0.5,
            "type": "Admin",
            "vector_embedding": mock_embedding(),
            "createdAt": now,
            "user_id": user_id
        },
        {
            "title": "Go to the gym",
            "due_date": now + timedelta(days=1),
            "cognitive_weight": 0.2,
            "duration": 1.5,
            "type": "Physical",
            "vector_embedding": mock_embedding(),
            "createdAt": now,
            "user_id": user_id
        },
        {
            "title": "Grocery shopping",
            "due_date": now + timedelta(days=1),
            "cognitive_weight": 0.2,
            "duration": 1.0,
            "type": "Admin",
            "vector_embedding": mock_embedding(),
            "createdAt": now,
            "user_id": user_id
        }
    ]
    
    result = await tasks_collection.insert_many(tasks)
    print(f"Successfully seeded {len(result.inserted_ids)} tasks for user Alyssa!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_db())

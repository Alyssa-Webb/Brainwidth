import asyncio
import os
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

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
    
    tasks_collection = db.tasks
    
    # Optional: Clear existing records before seeding
    await tasks_collection.delete_many({})
    print("Cleared existing tasks.")
    
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
            "createdAt": now
        },
        {
            "title": "Physics assignment",
            "due_date": now + timedelta(days=3),
            "cognitive_weight": 0.85,
            "duration": 2.0,
            "type": "STEM",
            "vector_embedding": mock_embedding(),
            "createdAt": now
        },
        # 3 Low-Tax Tasks
        {
            "title": "Reply to emails",
            "due_date": now + timedelta(days=1),
            "cognitive_weight": 0.3,
            "duration": 0.5,
            "type": "Admin",
            "vector_embedding": mock_embedding(),
            "createdAt": now
        },
        {
            "title": "Go to the gym",
            "due_date": now + timedelta(days=1),
            "cognitive_weight": 0.2,
            "duration": 1.5,
            "type": "Physical",
            "vector_embedding": mock_embedding(),
            "createdAt": now
        },
        {
            "title": "Grocery shopping",
            "due_date": now + timedelta(days=1),
            "cognitive_weight": 0.2,
            "duration": 1.0,
            "type": "Admin",
            "vector_embedding": mock_embedding(),
            "createdAt": now
        }
    ]
    
    result = await tasks_collection.insert_many(tasks)
    print(f"Successfully seeded {len(result.inserted_ids)} tasks!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_db())

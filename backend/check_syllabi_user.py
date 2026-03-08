import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "flux_db"

async def check():
    client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client[DB_NAME]
    docs = await db.syllabi.find({}).to_list(10)
    for d in docs:
        print(f"Course: {d.get('course_name')}, UserID: {d.get('user_id')}")
    
    users = await db.users.find({}).to_list(10)
    for u in users:
        print(f"User: {u.get('email')}, ID: {u.get('_id')}")

if __name__ == "__main__":
    asyncio.run(check())

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
    count = await db.syllabi.count_documents({})
    print(f"Syllabi count: {count}")
    docs = await db.syllabi.find({}).to_list(10)
    for d in docs:
        print(f"Course: {d.get('course_name')}, Load: {d.get('daily_load_penalty')}")

if __name__ == "__main__":
    asyncio.run(check())

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

# Load from environment in real scenario (Atlas string)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "flux_db")

client = None

async def init_db():
    global client
    try:
        # Client setup for async mongo
        client = AsyncIOMotorClient(MONGO_URI)
        # Send a ping to confirm a successful connection
        await client.admin.command('ping')
        print("Connected to MongoDB Atlas!")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")

def get_db():
    if client is not None:
        return client[DB_NAME]
    return None

async def close_db():
    global client
    if client is not None:
        client.close()

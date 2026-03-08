import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "flux_db")

client = None
db_instance = None

import certifi

async def init_db():
    global client, db_instance
    try:
        client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
        await client.admin.command('ping')
        db_instance = client[DB_NAME]
        print("Connected to MongoDB!")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")

def get_db():
    return db_instance

async def close_db():
    global client
    if client is not None:
        client.close()

async def find_similar_tasks_vector_search(db, query_vector: list[float], limit: int = 5):
    """
    Executes a $vectorSearch pipeline on MongoDB Atlas.
    """
    if db is None:
        return []
    
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "vector_embedding",
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": limit
            }
        },
        {
            "$project": {
                "title": 1,
                "duration": 1,
                "type": 1,
                "cognitive_weight": 1,
                "_id": 0,
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ]
    
    try:
        collection = db.tasks
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        return results
    except Exception as e:
        print("Vector search error. Ensure Vector Search index 'vector_index' is created in Atlas:", e)
        return []

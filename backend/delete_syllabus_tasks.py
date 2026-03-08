import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.flux_db
    
    # The old parser inserted tasks with source='Flux' or no specific source distinguishing them from manual tasks easily, 
    # but let's check what fields we can use. Wait, we can just delete all tasks since this is a fresh setup and the user 
    # explicitly wants syllabus tasks removed, or maybe all flux tasks? 
    # Let's inspect the tasks collection first to see the schema of the tasks to delete.
    
    tasks = await db.tasks.find().to_list(100)
    print(f"Total tasks found: {len(tasks)}")
    for t in tasks[:5]:
        print(t)

if __name__ == "__main__":
    asyncio.run(main())

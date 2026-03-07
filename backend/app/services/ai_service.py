# Stub for AI-driven Vector Search integration

def generate_embedding(text: str) -> list[float]:
    """
    Mock function to generate vector embedding.
    In prod, calls OpenAI (e.g. text-embedding-3-small)
    """
    # Returns a fake 1536-dim embedding for demo
    return [0.0] * 1536

async def find_similar_tasks(db, text_query: str):
    """
    Uses MongoDB Atlas Vector Search to find prior similar tasks
    to help AI predict duration and cognitive weight.
    """
    if db is None:
        return []
    
    query_vector = generate_embedding(text_query)
    
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": 5
            }
        },
        {
            "$project": {
                "title": 1,
                "duration": 1,
                "type": 1,
                "_id": 0,
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ]
    
    try:
        collection = db.tasks
        # Execute the Atlas Vector Search pipeline
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=5)
        return results
    except Exception as e:
        print("Vector search error (Atlas might not be configured):", e)
        return []

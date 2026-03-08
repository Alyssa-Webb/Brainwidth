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

def pick_goal_for_break(goals: list, gap_duration: float, hour: float) -> str:
    import os
    from langchain_google_genai import ChatGoogleGenerativeAI
    from pydantic import BaseModel, Field

    class GoalSelection(BaseModel):
        selected_goal: str = Field(description="The goal selected from the list that best fits this break duration.")

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        import random
        return random.choice(goals)
        
    prompt = f"""
    You are an AI scheduling assistant.
    The user has a {gap_duration}-hour break scheduled at hour {hour}:00.
    Here are their active goals: {', '.join(goals)}
    
    Pick exactly ONE goal from the list that is most appropriate to work on during a {gap_duration}-hour break at hour {hour}:00.
    Output only the exact string of the goal you selected from the list.
    """
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite-preview", api_key=api_key, temperature=0.7)
        structured_llm = llm.with_structured_output(GoalSelection)
        result = structured_llm.invoke(prompt)
        
        # Verify if the AI hallucinated or tweaked the string
        for g in goals:
            if result.selected_goal.lower() in g.lower():
                return g
        return goals[0]
    except Exception as e:
        print(f"Goal AI selection error: {e}")
        import random
        return random.choice(goals)
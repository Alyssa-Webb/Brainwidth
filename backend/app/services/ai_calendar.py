import os
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from app.engine.calculator import calculate_mental_tax, is_restful

class AIEventClassification(BaseModel):
    id: str = Field(description="The original ID of the event.")
    type: str = Field(description="The inferred type of the event (e.g., 'STEM', 'Deep Work', 'Meeting', 'Creative', 'Admin', 'Gym', 'Rest', 'Walk', 'Social').")
    is_restful: bool = Field(description="True if this event is a restorative break (Gym, Rest, Walk, Meditation, Social). False if it is a task requiring effort.")

class AIEventList(BaseModel):
    events: List[AIEventClassification]

async def classify_events_with_ai(events: list) -> dict:
    """
    Takes a list of raw calendar events and uses Gemini to classify them simultaneously.
    Returns a dictionary mapping event_id -> {type, is_restful}
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("[AI Calendar] No API key found. Falling back to simple keyword matching.")
        return {}
        
    if not events:
        return {}

    llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite-preview", api_key=api_key, temperature=0.1)
    structured_llm = llm.with_structured_output(AIEventList)
    
    # Prepare prompt data
    event_lines = []
    for ev in events:
        summary = ev.get("summary", "Untitled")
        desc = ev.get("description", "")[:100] # truncate
        event_lines.append(f"ID: {ev.get('id')} | Title: {summary} | Desc: {desc}")
        
    events_text = "\n".join(event_lines)
    
    prompt = f"""
    You are an AI assistant for "Brainwidth", a cognitive load scheduling application.
    Classify the following calendar events. For each event, determine its 'type' and whether it is 'is_restful'.
    
    Valid generic types for tasks: 'STEM', 'Deep Work', 'Meeting', 'Creative', 'Admin'.
    Valid generic types for restorative breaks (is_restful=True): 'Gym', 'Rest', 'Walk', 'Social', 'Meditation'.
    
    Events to classify:
    {events_text}
    """
    
    try:
        print(f"[AI Calendar] Calling Gemini to classify {len(events)} events...")
        # structured_llm.invoke is sync, but we want async. ChatGoogleGenerativeAI supports ainvoke.
        result = await structured_llm.ainvoke(prompt)
        
        mapping = {}
        for item in result.events:
            mapping[item.id] = {
                "type": item.type,
                "is_restful": item.is_restful
            }
        return mapping
    except Exception as e:
        print(f"[AI Calendar] AI classification failed: {e}")
        return {}
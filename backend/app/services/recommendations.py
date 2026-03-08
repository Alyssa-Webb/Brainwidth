"""
Recommendations service: generates personalized scheduling tips based on
the user's profile (chronotype, base_capacity, goals) and their current schedule.
"""

import os
from typing import List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from app.engine.calculator import CHRONOTYPE_PEAKS

class AIInsight(BaseModel):
    title: str = Field(description="A short, catchy title for the insight.")
    message: str = Field(description="The insight text. Must explicitly relate their schedule to their goals or chronotype. Actionable advice only.")

class AIInsightList(BaseModel):
    insights: List[AIInsight]

def generate_ai_schedule_insights(user: dict, schedule: dict) -> list:
    """Uses Gemini to generate 1-2 dynamic, personalized schedule insights based on goals and chronotype."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return []
        
    goals = user.get("goals", [])
    if not goals:
        return []
        
    chronotype = user.get("chronotype", "bear")
    peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
    
    # Format a string summary of the schedule for the LLM
    sched_summary = []
    for day, data in schedule.items():
        if data["tasks"]:
            task_list = ", ".join([f"{t.get('title', 'Task')} ({t.get('type', 'Work')})" for t in data["tasks"]])
            sched_summary.append(f"{day}: {task_list}")
    
    
    sched_text = "\n".join(sched_summary) if sched_summary else "No tasks scheduled yet."
    
    prompt = f"""
    You are an expert cognitive scheduling AI. The user has explicitly set the following goals:
    {', '.join(goals)}
    
    Their chronotype is '{chronotype}'. Their peak productivity window is {peak['peak_start']}:00 - {peak['peak_end']}:00.
    
    Here is a summary of their upcoming scheduled tasks:
    {sched_text}
    
    Analyze this schedule. If they have no tasks scheduled yet, suggest exactly how they should begin scheduling tasks to reach their goals based on their '{chronotype}' peak hours.
    If they do have tasks, check if there are tasks scheduled outside their peak hours that should be moved, and explicitly check if their schedule actively aligns with their stated goals. 
    Generate 1 or 2 highly specific, actionable insights explaining how to optimize their setup.
    If everything looks great, tell them why.
    """
    
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=api_key, temperature=0.2)
    structured_llm = llm.with_structured_output(AIInsightList)
    
    try:
        result = structured_llm.invoke(prompt)
        ai_recs = []
        for insight in result.insights[:2]:  # Limit to 2
            ai_recs.append({
                "type": "ai_insight",
                "title": f"✨ {insight.title}",
                "message": insight.message,
                "severity": "medium"
            })
        return ai_recs
    except Exception as e:
        print(f"[Recommendations] Gemini Insight Error: {e}")
        return []


def generate_recommendations(user: dict, schedule: dict, max_daily_load: float) -> list:
    """
    Returns a list of recommendation dicts with type, message, and severity.
    
    Args:
        user: MongoDB user document including chronotype, base_capacity, goals, etc.
        schedule: Optimized week schedule from the /optimize endpoint
        max_daily_load: Peak cognitive load found across the week
    """
    chronotype = user.get("chronotype", "bear")
    base_capacity = user.get("base_capacity", 8.0)
    goals = user.get("goals", [])
    work_start = user.get("work_start_hour", 8)
    
    recs = []
    
    # --- Capacity Warnings ---
    if max_daily_load > base_capacity:
        overflow = round(max_daily_load - base_capacity, 2)
        recs.append({
            "type": "warning",
            "title": "Over Capacity Alert",
            "message": f"Your peak day exceeds your base capacity by {overflow:.1f} units. Consider postponing low-priority tasks.",
            "severity": "high"
        })
    elif max_daily_load > base_capacity * 0.85:
        recs.append({
            "type": "caution",
            "title": "Near Capacity",
            "message": f"Your schedule is at {round((max_daily_load / base_capacity) * 100)}% of your personal limit. Keep an eye on upcoming tasks.",
            "severity": "medium"
        })
    else:
        recs.append({
            "type": "success",
            "title": "Well-Balanced Week",
            "message": "Your cognitive load is well within your personal capacity. Great scheduling!",
            "severity": "low"
        })
    
    # --- Chronotype-Specific Tips ---
    peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
    peak_label = f"{peak['peak_start']}:00–{peak['peak_end']}:00"
    chronotype_messages = {
        "lion": "🦁 Lion (15% of people): Early riser/morning person. Schedule: Wake ~5:30 a.m., Sleep ~9:30 p.m. AI Insight: It is recommended you work during your Peak Productivity (7 a.m. to 12 p.m.) and rest in the afternoon. Best Routine: Tackle high-priority, analytical, or physical work early, as energy drops in the afternoon.",
        "bear": "🐻 Bear (40% of people): Follows the sun. Schedule: Wake ~7 a.m., Sleep ~11 p.m. AI Insight: It is recommended you work during your Peak Productivity (10 a.m. to 2 p.m.) and rest in the early evening. Best Routine: Deep work in the morning, administrative tasks in the afternoon slump, and exercise in the early evening.",
        "wolf": "🐺 Wolf (Night Owl) (35% of people): Extreme evening focus. Schedule: Wake ~10 a.m.+, Sleep ~2 a.m.+. AI Insight: It is recommended you work during your Peak Productivity (4 p.m. to 6 p.m. or later) and ease into the morning. Best Routine: Creative or deep work in the evening; ease into the morning with lighter tasks.",
        "dolphin": "🐬 Dolphin (10% of people): Sensitive sleeper/insomniac. Schedule: Wake ~6:30 a.m., Sleep ~11:30 p.m. AI Insight: It is recommended you work during your Peak Productivity (10 a.m. to 2 p.m.) and rest as needed. Best Routine: Requires a more flexible schedule, with focus on consistent, moderate-intensity workouts to manage stress.",
    }
    recs.append({
        "type": "chronotype",
        "title": "Chronotype Tip",
        "message": chronotype_messages.get(chronotype, chronotype_messages.get("bear", "")),
        "severity": "info"
    })
    
    # --- Decompression Reminder ---
    has_heavy_stem = any(
        task.get("mental_tax", 0) > 1.5
        for day in schedule.values()
        for task in day.get("tasks", [])
    )
    if has_heavy_stem:
        recs.append({
            "type": "break",
            "title": "Schedule Decompression Blocks",
            "message": "High-intensity tasks detected. Click 'Decompression Mode' to automatically insert recovery breaks between focus blocks.",
            "severity": "medium"
        })
    
    # --- Goals Progress ---
    if goals:
        recs.append({
            "type": "goals",
            "title": "Your Goals",
            "message": f"You have {len(goals)} active goal(s): {', '.join(goals[:3])}{'...' if len(goals) > 3 else ''}. Keep scheduling to stay on track!",
            "severity": "info"
        })
    else:
        recs.append({
            "type": "goals",
            "title": "Set Your Goals",
            "message": "You haven't set any personal goals yet. Visit your Profile to add goals and get tailored recommendations.",
            "severity": "low"
        })
    
    # --- Recovery Window Identification ---
    recs.append({
        "type": "recovery",
        "title": "Recovery Windows",
        "message": f"Based on your chronotype, your ideal recovery windows are before {work_start}:00am and after {peak['peak_end']}:00pm. Avoid scheduling cognitive work outside these bounds.",
        "severity": "info"
    })
    
    # --- Dynamic Gemini AI Insights ---
    try:
        ai_dynamic_recs = generate_ai_schedule_insights(user, schedule)
        # We append these high-value insights directly after the static chronotype tip
        if ai_dynamic_recs:
            recs.extend(ai_dynamic_recs)
    except Exception as e:
        print(f"Error generating dynamic AI insights: {e}")
    
    return recs
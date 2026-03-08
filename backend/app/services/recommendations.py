"""
Recommendations service: generates personalized scheduling tips based on
the user's profile (chronotype, base_capacity, goals) and their current schedule.
"""

from app.engine.calculator import CHRONOTYPE_PEAKS


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
        "lion": f"🦁 Lion detected! You're an early riser. Schedule your most demanding deep work between {peak['peak_start']}:00–{peak['peak_end']}:00 when your focus is razor-sharp.",
        "bear": f"🐻 Bear detected! Your energy follows the sun. Aim for peak focus between {peak['peak_start']}:00–{peak['peak_end']}:00. Use your late afternoon secondary window for lighter tasks.",
        "wolf": f"🐺 Wolf detected! Your focus intensifies as the day goes on. Save your heaviest cognitive lifting for {peak['peak_start']}:00–{peak['peak_end']}:00.",
        "night_owl": f"🦉 Night Owl detected! You thrive when the world is quiet. Your prime focus window is late: {peak['peak_start']}:00–{peak['peak_end']}:00.",
        "dolphin": f"🐬 Dolphin detected! You have a sensitive rhythm. Focus on your most critical tasks during your mid-day peak: {peak['peak_start']}:00–{peak['peak_end']}:00.",
    }
    recs.append({
        "type": "chronotype",
        "title": "Chronotype Tip",
        "message": chronotype_messages.get(chronotype, chronotype_messages["neutral"]),
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
    
    return recs

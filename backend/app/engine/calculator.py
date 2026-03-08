# The Mental Tax formula: T = sum(d_i * w_i) + delta
# w_i: Cognitive Weight (STEM = 0.9, Admin = 0.3, Deep Work = 0.9, Shallow Work = 0.3, Meeting = 0.5)
# delta: context-switch penalty (+0.15) if type differs

WEIGHTS = {
    "STEM": 0.9,
    "Deep Work": 0.9,
    "Admin": 0.3,
    "Shallow Work": 0.3,
    "Meeting": 0.5,
    "Creative": 0.8,
    "Physical": 0.2
}

CONTEXT_SWITCH_PENALTY = 0.15

# Chronotype peak performance windows (hour of day)
CHRONOTYPE_PEAKS = {
    "morning": {"peak_start": 7, "peak_end": 12, "secondary_start": 14, "secondary_end": 16},
    "evening":  {"peak_start": 14, "peak_end": 20, "secondary_start": 10, "secondary_end": 12},
    "neutral":  {"peak_start": 9, "peak_end": 17, "secondary_start": 9, "secondary_end": 17},
}

def get_weight(task_type: str) -> float:
    """Default to 0.5 if unknown type"""
    return WEIGHTS.get(task_type, 0.5)

def calculate_mental_tax(duration_hours: float, current_type: str, previous_type: str = None) -> tuple:
    """
    Computes the mental tax for a single task.
    Returns (total_tax, applied_context_switch_penalty)
    """
    weight = get_weight(current_type)
    base_tax = duration_hours * weight
    
    delta = 0.0
    switched = False
    if previous_type and current_type != previous_type:
        delta = CONTEXT_SWITCH_PENALTY
        switched = True
        
    return base_tax + delta, switched


def get_chronotype_multiplier(hour: int, chronotype: str) -> float:
    """Returns a 0.5–1.5 multiplier for a given hour based on the user's chronotype.
    - Peak hours → 1.5x (harder/more demanding)
    - Off-peak  → 0.6x (easier, recovery time)
    """
    profile = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["neutral"])
    if profile["peak_start"] <= hour < profile["peak_end"]:
        return 1.5  # Peak
    if profile["secondary_start"] <= hour < profile["secondary_end"]:
        return 1.1  # Secondary
    return 0.6  # Recovery / low performance window


def get_hourly_load_curve(
    tasks: list,
    chronotype: str = "neutral",
    work_start: int = 8,
    work_end: int = 20,
    base_capacity: float = 8.0
) -> list:
    """
    Generates a 24-slot array of cognitive load per hour for a given day.
    Spreads each task's mental tax evenly over its duration, starting at work_start.
    Applies chronotype multiplier to the raw load for visualization peaks/valleys.
    """
    hourly = [0.0] * 24
    current_hour = float(work_start)
    
    for task in tasks:
        duration = task.get("duration", 1.0) or 1.0
        mental_tax = task.get("mental_tax", 0.0) or 0.0
        tax_per_hour = mental_tax / max(duration, 0.01)
        
        hours_left = duration
        h = int(current_hour)
        while hours_left > 0 and h < work_end:
            slot_fill = min(1.0, hours_left)
            multiplier = get_chronotype_multiplier(h, chronotype)
            hourly[h] += round(tax_per_hour * slot_fill * multiplier, 3)
            hours_left -= slot_fill
            h += 1
            
        current_hour = min(h, work_end)
    
    # Normalize: mark recovery valleys (< 20% of base_capacity/8) as near 0
    threshold = (base_capacity / 8) * 0.2
    for i in range(24):
        if hourly[i] < threshold:
            hourly[i] = round(hourly[i], 3)  # keep realistic but low
            
    return hourly

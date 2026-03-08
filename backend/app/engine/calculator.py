# The Mental Tax formula: T = sum(d_i * w_i) + delta
# w_i: Cognitive Weight - positive = effort, negative = recovery
# delta: context-switch penalty (+0.15) if type differs

# Positive-tax task types (cognitive effort)
WEIGHTS = {
    "STEM": 0.9,
    "Deep Work": 0.9,
    "Creative": 0.8,
    "Meeting": 0.5,
    "Admin": 0.3,
    "Shallow Work": 0.3,
    "Physical": 0.2,
}

# Restful / recovery task types → NEGATIVE tax (help reduce total load)
RESTFUL_WEIGHTS = {
    "Rest": -0.4,
    "Meditation": -0.5,
    "Nap": -0.6,
    "Break": -0.3,
    "Recovery": -0.4,
    "Gym": -0.2,       # light negative – still physical exertion but restorative
    "Exercise": -0.2,
    "Walk": -0.3,
    "Social": -0.1,    # light restorative
}

# GCal event categories that map to restful types
GCAL_RESTFUL_KEYWORDS = [
    "gym", "meditation", "yoga", "nap", "rest", "break", "walk",
    "hike", "swim", "jog", "run", "workout", "exercise", "recovery",
]

CONTEXT_SWITCH_PENALTY = 0.15

# Chronotype peak performance windows (hour of day)
CHRONOTYPE_PEAKS = {
    "lion": {"peak_start": 7, "peak_end": 12, "secondary_start": 13, "secondary_end": 15},
    "bear": {"peak_start": 10, "peak_end": 14, "secondary_start": 16, "secondary_end": 18},
    "wolf": {"peak_start": 16, "peak_end": 18, "secondary_start": 18, "secondary_end": 22},
    "night_owl": {"peak_start": 20, "peak_end": 24, "secondary_start": 16, "secondary_end": 18},
    "dolphin": {"peak_start": 10, "peak_end": 14, "secondary_start": 17, "secondary_end": 19},
}


def is_restful(task_type: str, title: str = "") -> bool:
    """Returns True if a task/event should have negative (restorative) mental tax."""
    if task_type in RESTFUL_WEIGHTS:
        return True
    title_lower = title.lower()
    return any(kw in title_lower for kw in GCAL_RESTFUL_KEYWORDS)


def get_weight(task_type: str, title: str = "") -> float:
    """Returns the cognitive weight, negative for restful types."""
    if is_restful(task_type, title):
        return RESTFUL_WEIGHTS.get(task_type, -0.3)
    return WEIGHTS.get(task_type, 0.5)


def calculate_mental_tax(
    duration_hours: float,
    current_type: str,
    previous_type: str = None,
    title: str = ""
) -> tuple:
    """
    Computes the mental tax for a single task.
    - Positive types: base_tax = duration * weight (always ≥ 0.0)
    - Restful types: base_tax = duration * negative_weight (recovery credit)
    - Minimum overall tax is 0.0 (floor enforced upstream per-day)
    Returns (raw_tax, applied_context_switch_penalty)
    """
    weight = get_weight(current_type, title)
    base_tax = duration_hours * weight

    delta = 0.0
    switched = False
    # Only apply context-switch penalty for positive-tax tasks
    if weight > 0 and previous_type and current_type != previous_type:
        if not is_restful(previous_type):
            delta = CONTEXT_SWITCH_PENALTY
            switched = True

    return base_tax + delta, switched


def get_chronotype_multiplier(hour: int, chronotype: str) -> float:
    """Returns a multiplier for a given hour based on the user's chronotype."""
    profile = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
    if profile["peak_start"] <= hour < profile["peak_end"]:
        return 1.5  # Peak
    if profile["secondary_start"] <= hour < profile["secondary_end"]:
        return 1.1
    return 0.6  # Recovery window


def get_hourly_load_curve(
    tasks: list,
    chronotype: str = "bear",
    work_start: int = 8,
    work_end: int = 20,
    base_capacity: float = 8.0
) -> list:
    """
    Generates a 24-slot array of cognitive load per hour.
    - Restful task values go NEGATIVE (recovery valleys shown in green).
    - Gaps between tasks are scored as mild negative (recovery).
    """
    hourly = [0.0] * 24
    current_hour = float(work_start)

    for task in tasks:
        duration = float(task.get("duration", 1.0) or 1.0)
        mental_tax = float(task.get("mental_tax", 0.0) or 0.0)
        tax_per_hour = mental_tax / max(duration, 0.01)

        start_h = float(task.get("start_hour", current_hour) or current_hour)

        # Gap recovery
        if start_h > current_hour:
            gap_dur = start_h - current_hour
            # Fill the gap hours
            temp_h = current_hour
            left = gap_dur
            while left > 0:
                h_idx = int(temp_h)
                if h_idx >= 24: break
                chunk = min(left, 1.0 - (temp_h % 1.0) if temp_h % 1.0 != 0 else 1.0)
                if work_start <= h_idx < work_end:
                    hourly[h_idx] -= 0.1 * chunk
                temp_h += chunk
                left -= chunk

        # Task load
        temp_h = start_h
        left = duration
        while left > 0:
            h_idx = int(temp_h)
            if h_idx >= 24: break
            chunk = min(left, 1.0 - (temp_h % 1.0) if temp_h % 1.0 != 0 else 1.0)
            
            if mental_tax >= 0:
                multiplier = get_chronotype_multiplier(h_idx, chronotype)
            else:
                multiplier = 1.0
            
            hourly[h_idx] += round(tax_per_hour * chunk * multiplier, 3)
            temp_h += chunk
            left -= chunk

        current_hour = max(current_hour, temp_h)

    return hourly


def get_next_available_slot(current_time: float, duration: float, chronotype: str, work_end: int = 24) -> float:
    """
    Finds the earliest start time >= current_time such that a task of `duration`
    fits entirely within either the Peak window or Secondary window.
    If it cannot fit (e.g. task is 3 hours but windows are 2 hours), it will just return current_time.
    """
    peak = CHRONOTYPE_PEAKS.get(chronotype, {})
    if not peak:
        return current_time
        
    p_start, p_end = peak.get("peak_start", 8), peak.get("peak_end", 12)
    s_start, s_end = peak.get("secondary_start", 13), peak.get("secondary_end", 17)
    
    # Try fitting in Peak
    if current_time <= p_end - duration:
        return max(current_time, float(p_start))
        
    # Try fitting in Secondary
    if current_time <= s_end - duration:
        return max(current_time, float(s_start))
        
    # If we overflowed both for today, just cap it to the end or wrap it, for now just return current_time
    return current_time

def build_decompression_breaks(
    tasks: list,
    chronotype: str = "bear",
    work_start: int = 8,
    work_end: int = 20
) -> list:
    """
    Given a scheduled list of tasks (sorted by start_hour),
    inserts 15-30 min recovery break events between heavy tasks.
    Break events have negative mental_tax = recovery.
    Returns the new enriched list with breaks interleaved.
    """
    result = []
    
    # Push tasks to start exactly at the recommended peak bounds 
    peak_info = CHRONOTYPE_PEAKS.get(chronotype, {})
    peak_start = peak_info.get("peak_start", work_start)
    
    prev_end_hour = float(max(work_start, peak_start))

    # First, stabilize the schedule: ensure no overlaps in the input tasks
    # and assign start times to flexible tasks.
    sorted_tasks = sorted(tasks, key=lambda x: (x.get("is_fixed", False), x.get("start_hour") or 0), reverse=True)
    # Actually, the tasks passed here are already "scheduled" in a sense (sorted by start_hour or chronotype preference)
    # but flexible tasks might not have start_hour.
    
    # We'll stick to the current iterative approach but be more careful.
    for i, task in enumerate(tasks):
        sh = task.get("start_hour")
        if sh is None:
            sh = get_next_available_slot(prev_end_hour, duration, chronotype)
        else:
            sh = float(sh)
            
        duration = float(task.get("duration") or 1.0)
        tax = float(task.get("mental_tax") or 0.0)

        # 0. Check for massive time jumps (Off-Peak Rest Period) First!
        if sh > prev_end_hour:
            gap_dur = sh - prev_end_hour
            if gap_dur >= 1.0: # If it's a large gap (like 2+ hours skipped), it's a rest hour
                # Check for overlaps with already scheduled tasks (like fixed GCal events)
                overlap = False
                for r_task in result:
                    r_start = r_task.get("start_hour", 0)
                    r_end = r_start + r_task.get("duration", 0)
                    if max(prev_end_hour, r_start) < min(sh, r_end):
                        overlap = True
                        break
                
                if not overlap:
                    result.append({
                        "title": "🌙 Scheduled Rest",
                        "duration": gap_dur,
                        "type": "Break",
                        "start_hour": prev_end_hour,
                        "mental_tax": round(-0.4 * gap_dur, 2),
                        "source": "AI Optimizer",
                        "is_fixed": False,
                        "is_break": True,
                    })
                # Set prev to sh so the next break logic doesn't insert a second 🌿 Recovery Break inside the rest block
                prev_end_hour = sh

        # 1. "Before" Break logic
        if result and tax > 0.5 and sh > prev_end_hour:
            # Check if previous item was a break
            last_was_break = result[-1].get("is_break", False)
            if not last_was_break:
                gap = sh - prev_end_hour
                if gap >= 0.25: # Only if at least 15 min gap
                    break_dur = min(0.5, gap)
                    result.append({
                        "title": "🌿 Recovery Break",
                        "duration": break_dur,
                        "type": "Break",
                        "start_hour": sh - break_dur, 
                        "mental_tax": round(-0.3 * break_dur, 2),
                        "source": "Flux (Auto)",
                        "is_fixed": False,
                        "is_break": True,
                    })
        
        # Add the task itself (ensure we don't accidentally regress start_hour)
        task["start_hour"] = sh
        result.append(task)
        prev_end_hour = sh + duration

        # 2. "After" Break logic
        if tax > 0.8 and not task.get("is_break") and prev_end_hour < work_end:
            # Peek at next task's start time if it exists
            next_start = None
            if i + 1 < len(tasks):
                next_start = tasks[i+1].get("start_hour")
            
            # If no next task or there's space before it
            if next_start is None or next_start >= prev_end_hour + 0.25:
                result.append({
                    "title": "☕ Micro-Break",
                    "duration": 0.25,
                    "type": "Break",
                    "start_hour": prev_end_hour,
                    "mental_tax": -0.15,
                    "source": "Flux (Auto)",
                    "is_fixed": False,
                    "is_break": True,
                })
                prev_end_hour += 0.25

    return result

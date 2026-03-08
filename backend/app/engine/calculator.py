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
    "morning": {"peak_start": 7, "peak_end": 12, "secondary_start": 14, "secondary_end": 16},
    "evening": {"peak_start": 14, "peak_end": 20, "secondary_start": 10, "secondary_end": 12},
    "neutral": {"peak_start": 9, "peak_end": 17, "secondary_start": 9, "secondary_end": 17},
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
    profile = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["neutral"])
    if profile["peak_start"] <= hour < profile["peak_end"]:
        return 1.5  # Peak
    if profile["secondary_start"] <= hour < profile["secondary_end"]:
        return 1.1
    return 0.6  # Recovery window


def get_hourly_load_curve(
    tasks: list,
    chronotype: str = "neutral",
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
        duration = task.get("duration", 1.0) or 1.0
        mental_tax = task.get("mental_tax", 0.0) or 0.0  # already signed
        tax_per_hour = mental_tax / max(duration, 0.01)

        start_h = int(task.get("start_hour", current_hour) or current_hour)

        # Gap recovery: hours between last task end and this task start
        gap_hours = max(0, start_h - int(current_hour))
        if gap_hours > 0:
            gap_recovery = -0.1  # mild negative per idle hour
            for g in range(int(current_hour), start_h):
                if work_start <= g < work_end:
                    hourly[g] += gap_recovery

        hours_left = duration
        h = start_h
        while hours_left > 0 and h < work_end:
            slot_fill = min(1.0, hours_left)
            if mental_tax >= 0:
                multiplier = get_chronotype_multiplier(h, chronotype)
            else:
                multiplier = 1.0  # recovery tasks not amplified by chronotype
            hourly[h] += round(tax_per_hour * slot_fill * multiplier, 3)
            hours_left -= slot_fill
            h += 1

        current_hour = float(h)

    return hourly


def build_decompression_breaks(
    tasks: list,
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
    prev_end_hour = float(work_start)

    for task in tasks:
        sh = float(task.get("start_hour") or prev_end_hour)
        duration = float(task.get("duration") or 1.0)
        tax = float(task.get("mental_tax") or 0.0)

        # Insert a break if the previous task was heavy AND there's time
        if result and tax > 0.5 and sh > prev_end_hour:
            break_duration = min(0.5, sh - prev_end_hour)
            result.append({
                "title": "🌿 Recovery Break",
                "duration": break_duration,
                "type": "Break",
                "start_hour": int(prev_end_hour),
                "mental_tax": round(-0.3 * break_duration, 2),
                "source": "Flux (Auto)",
                "is_fixed": False,
                "is_break": True,
            })
        elif task.get("mental_tax", 0) > 0.8 and not task.get("is_break"):
            # Heavy task – inject a micro-break after it
            pass  # break after instead

        result.append(task)
        prev_end_hour = sh + duration

        # Append a recovery break AFTER each high-tax task
        if tax > 0.8 and not task.get("is_break") and prev_end_hour < work_end:
            result.append({
                "title": "☕ Micro-Break",
                "duration": 0.25,
                "type": "Break",
                "start_hour": int(prev_end_hour),
                "mental_tax": -0.15,
                "source": "Flux (Auto)",
                "is_fixed": False,
                "is_break": True,
            })
            prev_end_hour += 0.25

    return result

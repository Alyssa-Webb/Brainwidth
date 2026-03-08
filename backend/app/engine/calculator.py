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
    "lion": {"peak_start": 5, "peak_end": 10, "secondary_start": 5, "secondary_end": 12},
    "bear": {"peak_start": 10, "peak_end": 14, "secondary_start": 10, "secondary_end": 14},
    "wolf": {"peak_start": 12, "peak_end": 15, "secondary_start": 17, "secondary_end": 21},
    "dolphin": {"peak_start": 10, "peak_end": 13, "secondary_start": 10, "secondary_end": 13},
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
    peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
    work_start_f = float(min(peak["peak_start"], peak["secondary_start"]))
    work_end_f = float(max(peak["peak_end"], peak["secondary_end"]))
    
    hourly = [0.0] * 24
    current_hour = work_start_f

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
                if work_start_f <= h_idx < work_end_f:
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

def get_next_available_slot(current_time: float, duration: float, chronotype: str, busy_slots: list[tuple[float, float]], work_start: float = 8.0, work_end: float = 20.0, ignore_peaks: bool = False) -> float:
    """
    Finds the earliest start time >= current_time such that a task of `duration`
    fits without overlapping busy_slots.
    """
    peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
    work_start_f = float(min(peak["peak_start"], peak["secondary_start"]))
    work_end_f = float(max(peak["peak_end"], peak["secondary_end"]))
    
    if ignore_peaks:
        # For weights, prefer the start of the day (work_start)
        windows = [(work_start_f, work_end_f)]
    else:
        windows = [
            (peak["peak_start"], peak["peak_end"]),
            (peak["secondary_start"], peak["secondary_end"])
        ]
    
    def is_overlapping(start, end, slots):
        for s, e in slots:
            # Buffer of 0.001 (approx 4 seconds)
            if max(start, s) + 0.001 < min(end, e):
                return True
        return False

    for w_start, w_end in windows:
        t = max(current_time, float(w_start))
        
        # Inner loop: search within this window
        while t + duration <= w_end + 0.001:
            if not is_overlapping(t, t + duration, busy_slots):
                return round(t, 2)
                
            # Find the slot we collided with and jump to its end
            collided_slot_end = None
            for s, e in busy_slots:
                if max(t, s) + 0.001 < min(t + duration, e):
                    # We hit this one. Jump to its end.
                    if collided_slot_end is None or e > collided_slot_end:
                        collided_slot_end = e
            
            if collided_slot_end is not None:
                t = collided_slot_end
            else:
                t += 0.25 # Safety increment
                
    return None

def build_decompression_breaks(
    tasks: list,
    chronotype: str = "bear",
    work_start: int = 8,
    work_end: int = 20,
    decompress: bool = False,
    goals: list = None
) -> list:
    """
    Main scheduling engine. Distinguishes between fixed events, 
    morning-priority 'Weights', and chronotype-aware flexible tasks.
    """
    # Use the chronotype directly instead of the 8am-8pm defaults
    peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
    work_start_f = float(min(peak["peak_start"], peak["secondary_start"]))
    work_end_f = float(max(peak["peak_end"], peak["secondary_end"]))

    # 1. Categorize Tasks
    fixed = sorted([t for t in tasks if t.get("is_fixed")], key=lambda x: x.get("start_hour", 0))
    # Weights are Syllabus items (flexible but pinned to morning)
    weights = [t for t in tasks if t.get("is_weight") and not t.get("is_fixed")]
    # Flexible are regular user tasks/assignments
    flexible = [t for t in tasks if not t.get("is_fixed") and not t.get("is_weight")]
    
    if decompress:
        flexible.sort(key=lambda x: x.get("mental_tax", 0), reverse=True)

    # 2. Track Busy Slots (init with fixed events from GCal/Manual)
    busy_slots = []
    for ft in fixed:
        sh = ft.get("start_hour", work_start_f)
        d = ft.get("duration", 1.0)
        busy_slots.append((sh, sh + d))
    
    scheduled = []

    # 3. Schedule Weights (Pin to Morning consecutively)
    w_ptr = work_start_f
    for wt in weights:
        dur = float(wt.get("duration", 0.5))
        sh = get_next_available_slot(w_ptr, dur, chronotype, busy_slots, work_start=work_start_f, work_end=work_end_f, ignore_peaks=True)
        if sh is not None:
            wt["start_hour"] = sh
            busy_slots.append((sh, sh + dur))
            scheduled.append(wt)
            w_ptr = sh + dur
        else:
            # Better fallback: Push to peak start but still track busy_slots to prevent STACKING
            sh_fallback = get_next_available_slot(0.0, dur, chronotype, busy_slots)
            if sh_fallback is None:
                peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
                sh_fallback = float(peak["peak_start"])
            wt["start_hour"] = sh_fallback
            busy_slots.append((sh_fallback, sh_fallback + dur))
            scheduled.append(wt)

    # 4. Schedule Flexible Tasks (Chronotype Peaks)
    # Use a pointer that starts at work_start_f but increments as tasks are placed
    f_ptr = work_start_f
    for t in flexible:
        dur = float(t.get("duration", 1.0))
        sh = get_next_available_slot(f_ptr, dur, chronotype, busy_slots, work_start=work_start_f, work_end=work_end_f)
        
        if sh is None:
            # Fallback for this task specifically: search from work_start again
            sh = get_next_available_slot(work_start_f, dur, chronotype, busy_slots, work_start=work_start_f, work_end=work_end_f)

        if sh is not None:
            t["start_hour"] = sh
            busy_slots.append((sh, sh + dur))
            scheduled.append(t)
            # Update pointer to the end of this task to encourage sequential flow
            f_ptr = sh + dur
        else:
            # Absolute fallback: Search the whole day
            sh_fallback = get_next_available_slot(0.0, dur, chronotype, busy_slots)
            if sh_fallback is None:
                peak = CHRONOTYPE_PEAKS.get(chronotype, CHRONOTYPE_PEAKS["bear"])
                sh_fallback = float(peak["peak_start"])
            t["start_hour"] = sh_fallback
            busy_slots.append((sh_fallback, sh_fallback + dur))
            scheduled.append(t)
            f_ptr = max(f_ptr, sh_fallback + dur)

    # Combine and add breaks/rests
    all_tasks = sorted(fixed + scheduled, key=lambda x: x.get("start_hour", 0))
    enriched = []
    cursor = work_start_f

    for i, task in enumerate(all_tasks):
        sh = float(task.get("start_hour", cursor))
        dur = float(task.get("duration", 1.0))
        tax = float(task.get("mental_tax", 0.0))

        # Gap Rest (Decompress mode only)
        if decompress and sh > cursor:
            start_gap = max(cursor, work_start_f)
            end_gap = min(sh, work_end_f)
            gap = end_gap - start_gap
            if gap >= 0.5:
                title = "🌿 Gap Recovery"
                if gap >= 1.0:
                    import random
                    from app.services.ai_service import pick_goal_for_break
                    if goals and len(goals) > 0 and random.random() < 0.5:
                        chosen_goal = pick_goal_for_break(goals, gap, start_gap)
                        title = f"🌟 Goal: {chosen_goal}"
                    else:
                        title = "🌙 Scheduled Rest"

                enriched.append({
                    "title": title,
                    "duration": gap,
                    "type": "Break",
                    "start_hour": start_gap,
                    "mental_tax": round(-0.4 * gap, 2),
                    "source": "AI Optimizer",
                    "is_fixed": False,
                    "is_break": True,
                })
        
        enriched.append(task)
        
        # Post-task Micro-break
        if decompress and tax >= 0.7:
            nxt = all_tasks[i+1].get("start_hour", work_end_f) if i+1 < len(all_tasks) else work_end_f
            if nxt > sh + dur:
                start_micro = sh + dur
                end_micro = min(nxt, work_end_f)
                b_dur = min(0.5, end_micro - start_micro)
                if b_dur >= 0.15:
                    enriched.append({
                        "title": "☕ Micro-Break",
                        "duration": b_dur,
                        "type": "Break",
                        "start_hour": start_micro,
                        "mental_tax": round(-0.3 * b_dur, 2),
                        "source": "Flux (Auto)",
                        "is_fixed": False,
                        "is_break": True,
                    })
                    dur += b_dur
        
        cursor = sh + dur

    return enriched

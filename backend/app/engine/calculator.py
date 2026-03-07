# The Mental Tax formula: T = sum(d_i * w_i) + delta
# w_i: Cognitive Weight (STEM = 0.9, Admin = 0.3, Deep Work = 0.9, Shallow Work = 0.3, Meeting = 0.5)
# delta: context-switch penalty (+0.15) if type differs

WEIGHTS = {
    "STEM": 0.9,
    "Deep Work": 0.9,
    "Admin": 0.3,
    "Shallow Work": 0.3,
    "Meeting": 0.5,
    "Creative": 0.8
}

CONTEXT_SWITCH_PENALTY = 0.15

def get_weight(task_type: str) -> float:
    # Default to 0.5 if unknown
    return WEIGHTS.get(task_type, 0.5)

def calculate_mental_tax(duration_hours: float, current_type: str, previous_type: str = None) -> tuple[float, bool]:
    """
    Computes the mental tax for a single task.
    Returns (total_tax, applied_context_switch_penalty)
    """
    weight = get_weight(current_type)
    
    # Base tax is duration * weight
    base_tax = duration_hours * weight
    
    # Apply delta if context switched
    delta = 0.0
    switched = False
    
    if previous_type and current_type != previous_type:
        delta = CONTEXT_SWITCH_PENALTY
        switched = True
        
    total_tax = base_tax + delta
    
    return total_tax, switched

from pulp import LpProblem, LpMinimize, LpVariable, lpSum, PULP_CBC_CMD

def balance_schedule(flexible_tasks, fixed_load_per_day, max_daily_load=8.0):
    """
    Optimize flexible tasks over 7 days to balance cognitive load using PuLP.
    flexible_tasks: list of dicts with 'id', 'title', 'mental_tax'
    fixed_load_per_day: list of 7 floats representing existing T for each day
    Returns: mapping of task_id to day_index (0 to 6)
    """
    num_days = 7
    num_tasks = len(flexible_tasks)
    
    if num_tasks == 0:
        return {}, max(fixed_load_per_day) if fixed_load_per_day else 0.0
    
    # Define problem
    prob = LpProblem("Flux_Load_Balancing", LpMinimize)
    
    # Define decision variables: x[i][j] = 1 if task i is scheduled on day j
    x = {
        (i, j): LpVariable(f"x_{i}_{j}", cat="Binary") 
        for i in range(num_tasks) for j in range(num_days)
    }
    
    # Define M: max load on any day
    M = LpVariable("M", lowBound=0, cat="Continuous")
    
    # Constraint 1: Each flexible task must be scheduled exactly once
    for i in range(num_tasks):
        prob += lpSum(x[(i, j)] for j in range(num_days)) == 1
        
    # Constraint 2: The total load on each day must be <= M
    for j in range(num_days):
        daily_load = fixed_load_per_day[j] + lpSum(flexible_tasks[i]['mental_tax'] * x[(i, j)] for i in range(num_tasks))
        prob += daily_load <= M
        
    # Objective: Minimize M + a tiny penalty to prefer earlier days (to naturally sort tasks)
    penalty = lpSum(0.001 * j * x[(i, j)] for i in range(num_tasks) for j in range(num_days))
    prob += M + penalty
    
    # Solve the problem
    prob.solve(PULP_CBC_CMD(msg=False))
    
    # Extract results
    schedule = {}
    for i in range(num_tasks):
        for j in range(num_days):
            if x[(i, j)].varValue == 1.0:
                schedule[flexible_tasks[i]['id']] = j
                break
                
    return schedule, M.varValue
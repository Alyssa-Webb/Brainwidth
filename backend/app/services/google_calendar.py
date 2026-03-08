import datetime

def fetch_events_next_7_days():
    """
    Mock Google Calendar integration returning events for the next 7 days.
    In a real implementation, this would use google-api-python-client with OAuth.
    """
    events = []
    today = datetime.datetime.utcnow().date()
    
    # Event for tomorrow
    events.append({
        "id": "gcal_1",
        "title": "Software Engineering Team Sync",
        "duration": 1.0, # 1 hour
        "type": "Meeting",
        "date": (today + datetime.timedelta(days=1)).isoformat() + "T10:00:00Z",
    })
    
    # Event for day 2
    events.append({
        "id": "gcal_2",
        "title": "Deep Work Architecture Block",
        "duration": 3.0, # 3 hours
        "type": "Deep Work",
        "date": (today + datetime.timedelta(days=2)).isoformat() + "T13:00:00Z",
    })

    # Event for day 4
    events.append({
        "id": "gcal_3",
        "title": "Doctor Appointment",
        "duration": 1.5,
        "type": "Admin",
        "date": (today + datetime.timedelta(days=4)).isoformat() + "T15:30:00Z",
    })
    
    return events

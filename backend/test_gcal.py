from google_auth_oauthlib.flow import InstalledAppFlow
import os

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
creds_path = "/Users/hymajujjuru/Documents/HackCU12/HACKCU12_Alyssa_Hyma/backend/credentials.json"

try:
    flow = InstalledAppFlow.from_client_secrets_file(
        creds_path, 
        scopes=["https://www.googleapis.com/auth/calendar"],
        redirect_uri="http://localhost:8000/api/auth/gcal/callback"
    )
    print("Flow initialized check")
except Exception as e:
    print(e)

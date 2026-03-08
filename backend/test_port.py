import urllib.request
try:
    code = urllib.request.urlopen("http://localhost:8000/api/auth/gcal/authorize").getcode()
    print("Backend listening on 8000:", code)
except Exception as e:
    print("Error:", e)

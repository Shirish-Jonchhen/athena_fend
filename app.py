from fastapi import FastAPI, Query
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlencode
import json

app = FastAPI(title="WebRTC Server")

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root(
    bend_url: str = Query(...),
    fend_url: str = Query(...),
    character: str = Query(...),
    visa_profile: str = Query(..., description="JSON string of visa profile")
):
    """
    Example request:
    /?bend_url=https://bc321aef08f0.ngrok-free.app&fend_url=https://candis-unencamped-illegitimately.ngrok-free.dev/&character=Lucy&visa_profile={...}
    """

    # Try parsing visa_profile to verify valid JSON
    try:
        visa_data = json.loads(visa_profile)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON in visa_profile"}

    # Prepare params for redirect (re-encode JSON safely)
    query_params = {
        "bend_url": bend_url,
        "fend_url": fend_url,
        "character": character,
        "visa_profile": json.dumps(visa_data),  # stringify cleanly again
    }

    redirect_url = f"/frontend/index.html?{urlencode(query_params)}"
    return RedirectResponse(url=redirect_url, status_code=307)
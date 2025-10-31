from fastapi import FastAPI, Query
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlencode
import base64
import json
import re

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

        # 1. Quote keys
        raw_str = re.sub(r'(\w+):', r'"\1":', visa_profile)

        # 2. Quote simple unquoted string values (naive approach)
        raw_str = re.sub(r': ([A-Za-z_][A-Za-z0-9_ ()]*)', r': "\1"', raw_str)

        # 3. Replace empty values with null
        raw_str = re.sub(r':\s*,', ': null,', raw_str)

        # 4. Fix UUID by removing stray quotes around the first part
        raw_str = re.sub(r'"([0-9a-f]{8})"-([0-9a-f-]+)', r'"\1-\2"', raw_str)

        # 5. Fix date format by quoting
        raw_str = re.sub(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+)', r'"\1"', raw_str)
        visa_data = json.loads(raw_str)
        print("visa_data=========")
        print(visa_data)
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
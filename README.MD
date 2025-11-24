# Setup:

- env setup:
```bash
python3 -m venv venv
```

- install:
```bash
source venv/bin/activate
```

# CMDS:

- activate env:
```bash
# for shirish sir
source /Users/shirish/NexSewa/voyage_interview/.venv/bin/activate

# or

source venv/bin/activate
```

- Start server:
```bash
uvicorn app:app --host 0.0.0.0 --port 3000 --workers 1
```
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

# Local testing:
```
http://localhost:3000/frontend/index.html?visa_profile=e2lkOiA5N2UzNTExZi01NTRjLTQ3MTgtYjMzMC0wYTk3MGQzNjJjYWIsIGRhdGE6IHt2aXNhX3R5cGU6IGYxX3Zpc2EsIHBlcnNvbmFsX2luZm86IHtmdWxsX25hbWU6IEpvaG4gU2VuYSwgZG9iOiAyMDAyLTA0LTE0IDAwOjAwOjAwLjAwMCwgZ2VuZGVyOiBNYWxlLCBuYXRpb25hbGl0eTogTmVwYWxlc2V9LCBlZHVjYXRpb25hbF9pbmZvOiB7aGlnaGVzdF9kZWdyZWU6IE1hc3RlcidzIERlZ3JlZSwgc2Nob29sX25hbWU6IFZveWFnZSBVbml2ZXJzaXR5IG9mIFRlY2hub2xvZ3ksIGdyYWR1YXRpb25feWVhcjogMjAyOCwgaW50ZW5kZWRfdW5pdmVyc2l0eTogVm95YWdlIFVuaXZlcnNpdHkgb2YgVGVjaG5vbG9neSwgaW50ZW5kZWRfcHJvZ3JhbTogQ29tcHV0ZXIgU2NpZW5jZSwgYWRtaXNzaW9uX3N0YXR1czogTm90IHNlbGVjdGVkIHlldCwgbWFqb3JfcHJvZ3JhbTogQ29tcHV0ZXIgU2NpZW5jZX0sIGZ1bmRpbmc6IHtjdXJyZW5jeTogVVNELCBwZXJzb25hbF9mdW5kOiAxNTAwMC4wLCBzY2hvbGFyc2hpcF9mdW5kOiAxMjAwMC4wLCBsb2FuX2Ftb3VudDogMC4wLCB0b3RhbF9mdW5kOiAyNzAwMC4wLCBmYW1pbHlfc3BvbnNvcnM6IFt7cmVsYXRpb25zaGlwOiBQYXJlbnQgKEZhdGhlciksIGpvYjogLCBhbm51YWxfaW5jb21lOiAwLjAsIGFtb3VudDogMC4wfV19fX0=&bend_url=http://0.0.0.0:8000&fend_url=http://0.0.0.0:3000&character=Lucy&gif_link=https://xempffbmtivdhptpdeyx.supabase.co/storage/v1/object/public/Interview_character/Gifs/lucy.gif&_cb=1763973598122
```
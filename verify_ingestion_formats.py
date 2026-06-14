#!/usr/bin/env python3
"""Verify /run-pipeline accepts every format the upload UI advertises.

Run AFTER restarting the backend (so it picks up the ingestion fixes).
Tests against http://127.0.0.1:8000/run-pipeline directly.
"""
import io
import sys
import requests

BASE = "http://127.0.0.1:8000"

EV1 = {"timestamp": "2026-06-14T10:00:00Z", "log_type": "auth", "source_ip": "1.2.3.4", "action": "failed_login"}
EV2 = {"timestamp": "2026-06-14T10:01:00Z", "log_type": "web", "source_ip": "5.6.7.8", "action": "suspicious_request"}


def build_cases():
    import json
    arr = json.dumps([EV1, EV2])
    jsonl = json.dumps(EV1) + "\n" + json.dumps(EV2) + "\n"
    wrapper = json.dumps({"events": [EV1, EV2]})
    csv = "timestamp,log_type,source_ip,action\n2026-06-14T10:00:00Z,auth,1.2.3.4,failed_login\n2026-06-14T10:01:00Z,web,5.6.7.8,suspicious_request\n"
    single = json.dumps(EV1)
    return [
        ("bare JSON array",            "logs.json",  arr,     200, 2),
        ("multi-line JSONL",           "logs.jsonl", jsonl,   200, 2),
        (".ndjson",                    "logs.ndjson",jsonl,   200, 2),
        ("{events:[...]} wrapper",     "logs.json",  wrapper, 200, 2),
        ("CSV with header",            "logs.csv",   csv,     200, 2),
        ("single JSON object",         "logs.json",  single,  200, 1),
        ("empty array (must 400)",     "logs.json",  "[]",    400, None),
        ("garbage (must 400)",         "logs.json",  "}{bad", 400, None),
    ]


def run():
    passed = failed = 0
    for name, fname, content, exp_code, exp_events in build_cases():
        files = {"file": (fname, io.BytesIO(content.encode()), "application/octet-stream")}
        try:
            r = requests.post(f"{BASE}/run-pipeline", files=files, timeout=60)
        except Exception as e:
            print(f"FAIL | {name}: request error {e}")
            failed += 1
            continue
        ok = r.status_code == exp_code
        detail = ""
        if ok and exp_events is not None:
            try:
                got = r.json().get("events")
                ok = got == exp_events
                detail = f"events={got} (expected {exp_events})"
            except Exception:
                ok = False
                detail = f"bad json: {r.text[:80]}"
        else:
            detail = f"HTTP {r.status_code} (expected {exp_code}) {r.text[:80]}"
        print(f"{'PASS' if ok else 'FAIL'} | {name}: {detail}")
        passed += ok
        failed += (not ok)
    print(f"\n==== {passed} passed, {failed} failed ====")
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if run() else 1)

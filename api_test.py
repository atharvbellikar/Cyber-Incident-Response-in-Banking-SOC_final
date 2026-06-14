"""Exhaustive backend API + pipeline verification. Hits the FastAPI backend on :8000."""
import json, sys, io, os, sqlite3
import requests

B = "http://127.0.0.1:8000"
passed, failed = [], []

# Clean slate: remove any persisted analyst feedback / FP suppression rules so the
# "all blocks populated" checks run on un-suppressed events. (Suppression is a real
# feature and is tested explicitly at the end.)
_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "soc_incidents.db")
try:
    _c = sqlite3.connect(_DB, timeout=5); _c.execute("DELETE FROM analyst_feedback"); _c.commit(); _c.close()
    print("(setup) cleared analyst_feedback / suppression rules\n")
except Exception as _e:
    print(f"(setup) WARNING could not clear feedback: {_e}\n")

def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(f"{'PASS' if cond else 'FAIL'} | {name}" + (f"  -- {detail}" if (detail and not cond) else ""))

def post_file(events):
    data = json.dumps(events).encode()
    return requests.post(f"{B}/run-pipeline", files={"file": ("logs.json", io.BytesIO(data), "application/json")}, timeout=60)

# ---- 0. clear ----
r = requests.delete(f"{B}/api/incidents", timeout=10)
check("DELETE /api/incidents", r.status_code == 200 and r.json().get("status") == "success", r.text)
check("GET /api/incidents empty after clear", requests.get(f"{B}/api/incidents").json() == [], "not empty")

# ---- 1. run-pipeline with diverse log types ----
LOGS = [
  {"timestamp":"2026-06-14T09:00:00Z","log_type":"network","source_ip":"185.220.101.1","destination_ip":"10.0.0.9","port":443,"protocol":"https","action":"beaconing","affected_host":"h1"},
  {"timestamp":"2026-06-14T09:01:00Z","log_type":"web","source_ip":"91.240.118.33","url":"/login?user=admin' OR '1'='1","action":"suspicious_request","affected_host":"h2"},
  {"timestamp":"2026-06-14T09:02:00Z","log_type":"network","source_ip":"10.10.1.50","destination_ip":"10.10.1.75","port":22,"protocol":"tcp","action":"port_scan","affected_host":"h3"},
  {"timestamp":"2026-06-14T09:03:00Z","log_type":"iot","source_ip":"192.0.2.45","action":"credential_abuse","protocol":"telnet","affected_host":"cam1"},
  {"timestamp":"2026-06-14T09:04:00Z","log_type":"auth","source_ip":"203.0.113.5","action":"failed_login","affected_host":"gw","user":"root"},
  {"timestamp":"2026-06-14T09:05:00Z","log_type":"endpoint","source_ip":"10.0.0.77","action":"file_encryption","affected_host":"ws1"},
]
r = post_file(LOGS)
check("POST /run-pipeline (6 mixed logs) -> 200", r.status_code == 200, f"{r.status_code} {r.text[:200]}")
check("POST /run-pipeline returns success/6", r.ok and r.json().get("status")=="success" and r.json().get("events")==6, r.text[:200])

incs = requests.get(f"{B}/api/incidents").json()
check("GET /api/incidents -> 6 incidents", len(incs) == 6, f"got {len(incs)}")

# ---- 2. every incident has all enriched blocks populated (no empty {} that should have data) ----
REQUIRED = ["raw_event","ingestion","feature_engineering","detection","anomaly_detection","threat_analysis",
            "ioc_enrichment","correlation_analysis","cis","ai_analysis","cvss","response","final_report","dashboard"]
for i, e in enumerate(incs):
    miss = [k for k in REQUIRED if not e.get(k)]
    check(f"incident[{i}] ({e.get('raw_event',{}).get('log_type')}/{e.get('raw_event',{}).get('action')}) all blocks non-empty", not miss, f"empty: {miss}")
    # key derived fields present
    d = e.get("detection",{}); cv = e.get("cvss",{}); fr = e.get("final_report",{}); db = e.get("dashboard",{})
    check(f"incident[{i}] detection.threat_type+confidence", bool(d.get("threat_type")) and d.get("confidence") is not None)
    check(f"incident[{i}] cvss.base_score numeric", isinstance(cv.get("base_score"), (int,float)))
    check(f"incident[{i}] final_report.owner+status+timeline", bool(fr.get("owner")) and bool(fr.get("status")) and len(fr.get("timeline",[]))>0)
    check(f"incident[{i}] dashboard.alert_title+severity+source_ip", bool(db.get("alert_title")) and bool(db.get("severity")) and bool(db.get("source_ip")))

# ---- 3. IOC matching fired on the tor IP ----
beacon = next((e for e in incs if e.get("raw_event",{}).get("source_ip")=="185.220.101.1"), None)
check("IOC match fired on 185.220.101.1", bool(beacon) and beacon.get("ioc_enrichment",{}).get("matched") is True and beacon.get("ioc_enrichment",{}).get("match_count",0)>=1,
      json.dumps(beacon.get("ioc_enrichment") if beacon else {}))
# ---- 4. CIS populated for web + network ----
web = next((e for e in incs if e.get("raw_event",{}).get("log_type")=="web"), None)
check("CIS top-level title populated for web event", bool(web) and bool(web.get("cis",{}).get("title")), json.dumps(web.get("cis") if web else {})[:200])

# ---- 5. GET single incident ----
eid = incs[0]["event_id"]
r = requests.get(f"{B}/api/incidents/{eid}")
check("GET /api/incidents/{id} valid -> 200", r.status_code==200 and r.json().get("event_id")==eid)
r = requests.get(f"{B}/api/incidents/does-not-exist")
check("GET /api/incidents/{bad} -> 404", r.status_code==404, str(r.status_code))

# ---- 6. action / status change ----
for action, expect in [("close","closed"),("escalate","investigating"),("Investigate","investigating"),("open","open")]:
    r = requests.post(f"{B}/api/incidents/{eid}/action", json={"action":action})
    check(f"POST action '{action}' -> {expect}", r.status_code==200 and r.json().get("currentStatus")==expect, r.text[:150])
# verify persisted
st = requests.get(f"{B}/api/incidents/{eid}").json().get("final_report",{}).get("status")
check("status change persisted to final_report.status", st=="open", f"got {st}")
r = requests.post(f"{B}/api/incidents/bad-id/action", json={"action":"close"})
check("POST action on bad id -> 404", r.status_code==404, str(r.status_code))

# ---- 7. feedback (valid labels) ----
for label in ["true_positive","false_negative","escalated"]:
    r = requests.post(f"{B}/api/incidents/{eid}/feedback", json={"label":label,"reason":"test","analyst_notes":"n"})
    check(f"POST feedback '{label}' -> 200", r.status_code==200 and r.json().get("status")=="success", r.text[:150])
# false_positive should create suppression
r = requests.post(f"{B}/api/incidents/{eid}/feedback", json={"label":"false_positive","reason":"known_good_ip","analyst_notes":"whitelisted"})
check("POST feedback 'false_positive' -> suppression_created", r.status_code==200 and r.json().get("suppression_created") is True, r.text[:150])
# invalid label -> 400
r = requests.post(f"{B}/api/incidents/{eid}/feedback", json={"label":"bogus"})
check("POST feedback invalid label -> 400", r.status_code==400, str(r.status_code))
# feedback on bad id -> 404
r = requests.post(f"{B}/api/incidents/bad/feedback", json={"label":"true_positive"})
check("POST feedback bad id -> 404", r.status_code==404, str(r.status_code))
# get feedback history
r = requests.get(f"{B}/api/incidents/{eid}/feedback")
check("GET feedback history -> list with >=4 records", r.status_code==200 and isinstance(r.json(),list) and len(r.json())>=4, f"{r.status_code} len={len(r.json()) if r.ok else '?'}")

# ---- 8. suppression rules ----
r = requests.get(f"{B}/api/suppression-rules")
check("GET /api/suppression-rules -> count>=1", r.status_code==200 and r.json().get("count",0)>=1, r.text[:150])

# ---- 9. simulate endpoint ----
sim_ev = {"event_id":"sim-test-1","raw_event":{"source_ip":"1.2.3.4"},"detection":{"severity":"low"},"dashboard":{"alert_title":"sim"}}
r = requests.post(f"{B}/api/simulate", json={"events":[sim_ev]})
check("POST /api/simulate -> success count 1", r.status_code==200 and r.json().get("count")==1, r.text[:150])
check("simulated event retrievable", requests.get(f"{B}/api/incidents/sim-test-1").status_code==200)

# ---- 10. edge cases: malformed + empty input ----
r = requests.post(f"{B}/run-pipeline", files={"file":("x.json", io.BytesIO(b"not json{{"), "application/json")})
check("POST /run-pipeline malformed -> clean 400 (not 500)", r.status_code==400 and r.json().get("status")=="error" and "message" in r.json(), f"{r.status_code} {r.text[:160]}")
r = post_file([])
check("POST /run-pipeline empty array -> clean 400", r.status_code==400 and r.json().get("status")=="error", f"{r.status_code} {r.text[:120]}")

# ---- 11. suppression feature end-to-end ----
SUP_IP = "203.0.113.211"
requests.delete(f"{B}/api/incidents")
post_file([{"timestamp":"2026-06-14T11:00:00Z","log_type":"network","source_ip":SUP_IP,"port":22,"action":"port_scan","affected_host":"sup-h"}])
sup_first = requests.get(f"{B}/api/incidents").json()
check("suppression setup: event ingested unsuppressed", len(sup_first)==1 and sup_first[0].get("detection",{}).get("suppressed") is not True)
sid = sup_first[0]["event_id"]
requests.post(f"{B}/api/incidents/{sid}/feedback", json={"label":"false_positive","reason":"authorized_scan","analyst_notes":"pentest"})
# re-ingest the SAME source IP -> should now be suppressed
requests.delete(f"{B}/api/incidents")
post_file([{"timestamp":"2026-06-14T11:05:00Z","log_type":"network","source_ip":SUP_IP,"port":22,"action":"port_scan","affected_host":"sup-h"}])
sup_second = requests.get(f"{B}/api/incidents").json()
check("suppression: re-ingested matching event is suppressed", len(sup_second)==1 and sup_second[0].get("detection",{}).get("suppressed") is True,
      json.dumps(sup_second[0].get("detection") if sup_second else {}))

print("\n================ SUMMARY ================")
print(f"PASSED: {len(passed)}   FAILED: {len(failed)}")
if failed:
    print("FAILED TESTS:"); [print("  -", f) for f in failed]
    sys.exit(1)
print("ALL BACKEND TESTS PASSED")

import sqlite3
import json

DB_PATH = "soc_incidents.db"
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

# ── Tables ──────────────────────────────────────────────────────────────────
print("=" * 60)
print("TABLES IN DATABASE")
print("=" * 60)
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for t in tables:
    print(f"  • {t['name']}")

# ── Incidents ────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("INCIDENTS TABLE")
print("=" * 60)
total = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
print(f"Total incidents stored: {total}")

print()
print("Latest 15 incidents (summary columns):")
print("-" * 60)
rows = conn.execute("""
    SELECT event_id, timestamp, severity, threat_type,
           affected_user, source_ip, status
    FROM incidents
    ORDER BY rowid DESC
    LIMIT 15
""").fetchall()
for r in rows:
    d = dict(r)
    print(f"  ID: {d['event_id']}")
    print(f"     time={d['timestamp']}  sev={d['severity']}  status={d['status']}")
    print(f"     threat={d['threat_type']}  user={d['affected_user']}  ip={d['source_ip']}")
    print()

# ── Severity Breakdown ───────────────────────────────────────────────────────
print("=" * 60)
print("SEVERITY BREAKDOWN")
print("=" * 60)
sev_rows = conn.execute("""
    SELECT severity, COUNT(*) as cnt
    FROM incidents
    GROUP BY severity
    ORDER BY cnt DESC
""").fetchall()
for r in sev_rows:
    print(f"  {r['severity']:<12} : {r['cnt']} incidents")

# ── Status Breakdown ─────────────────────────────────────────────────────────
print()
print("=" * 60)
print("STATUS BREAKDOWN")
print("=" * 60)
stat_rows = conn.execute("""
    SELECT status, COUNT(*) as cnt
    FROM incidents
    GROUP BY status
    ORDER BY cnt DESC
""").fetchall()
for r in stat_rows:
    print(f"  {r['status']:<15} : {r['cnt']} incidents")

# ── Threat Types ─────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("THREAT TYPE BREAKDOWN")
print("=" * 60)
tt_rows = conn.execute("""
    SELECT threat_type, COUNT(*) as cnt
    FROM incidents
    GROUP BY threat_type
    ORDER BY cnt DESC
""").fetchall()
for r in tt_rows:
    print(f"  {r['threat_type']:<35} : {r['cnt']}")

# ── Analyst Feedback ─────────────────────────────────────────────────────────
print()
print("=" * 60)
print("ANALYST FEEDBACK TABLE")
print("=" * 60)
fcount = conn.execute("SELECT COUNT(*) FROM analyst_feedback").fetchone()[0]
print(f"Total feedback entries: {fcount}")
if fcount > 0:
    frows = conn.execute("""
        SELECT feedback_id, event_id, label, reason, analyst_notes,
               source_ip, threat_type, affected_user, created_at
        FROM analyst_feedback
        ORDER BY feedback_id DESC
        LIMIT 10
    """).fetchall()
    print()
    for r in frows:
        d = dict(r)
        print(f"  #{d['feedback_id']} | {d['created_at']}")
        print(f"     event_id={d['event_id']}")
        print(f"     label={d['label']}  reason={d['reason']}")
        print(f"     threat={d['threat_type']}  ip={d['source_ip']}  user={d['affected_user']}")
        if d['analyst_notes']:
            print(f"     notes: {d['analyst_notes'][:80]}")
        print()

conn.close()
print("=" * 60)
print("Done.")

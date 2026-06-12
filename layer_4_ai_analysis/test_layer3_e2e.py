from ai_orchestrator import run_ai_analysis

# 🔥 Mixed realistic events
events = [
    # 🔴 SSH brute force
    {
        "type": "ssh_bruteforce",
        "src": "45.33.12.99",
        "dst": "10.0.1.5",
        "port": 22,
        "failures": 15,
        "score": 0.89
    },

    # 🔴 Possible data exfiltration
    {
        "type": "data_exfiltration",
        "src": "10.0.2.15",
        "dst": "185.199.110.153",
        "port": 443,
        "failures": 0,
        "score": 0.91
    },

    # 🟡 Suspicious login (new IP)
    {
        "type": "suspicious_login",
        "src": "203.0.113.77",
        "dst": "10.0.3.20",
        "port": 22,
        "failures": 2,
        "score": 0.72
    },

    # 🔴 Port scanning
    {
        "type": "port_scan",
        "src": "192.168.1.100",
        "dst": "10.0.0.0/24",
        "port": "multiple",
        "failures": 0,
        "score": 0.85
    },

    # 🟢 Normal-ish (low anomaly)
    {
        "type": "normal_activity",
        "src": "10.0.1.10",
        "dst": "10.0.1.20",
        "port": 80,
        "failures": 0,
        "score": 0.32
    }
]


def build_incident(event, idx):
    return {
        "event_id": f"TEST-{idx}",
        "timestamp": "2024-03-17T10:28:00Z",

        "raw_event": {
            "source_ip": event["src"],
            "destination_ip": event["dst"],
            "affected_user": "user_" + str(idx),
            "affected_host": "host_" + str(idx),
            "port": event["port"],
            "failed_attempts": event["failures"],
            "process": "ssh" if event["port"] == 22 else "unknown",
            "parent_process": "system"
        },

        "anomaly_detection": {
            "pyod_score": event["score"],
            "is_outlier": event["score"] > 0.8,
            "ueba_flags": ["new_ip"] if event["type"] == "suspicious_login" else [],
            "ueba_risk_boost": 0.2 if event["type"] != "normal_activity" else 0.0,
            "anomaly_score": event["score"],
            "anomaly_flagged": event["score"] > 0.6
        },

        "threat_analysis": {
            "threat_intel_match": event["type"] != "normal_activity",
            "mitre_tactic": "Credential Access" if event["type"] == "ssh_bruteforce"
                            else "Exfiltration" if event["type"] == "data_exfiltration"
                            else "Discovery" if event["type"] == "port_scan"
                            else "Initial Access"
        },
        "ioc_enrichment": {
            "ioc_matches": ["malicious_ip"] if event["type"] in ["ssh_bruteforce", "data_exfiltration"] else []
        },
        "cis": {
            "cis_violations": []
        },

        "correlation_analysis": {
            "linked_events": [],
            "event_count": 10 if event["type"] == "port_scan" else 2,
            "attack_timeline": []
        },

        "feature_engineering": {
            "is_off_hours": event["type"] != "normal_activity",
            "time_of_day": "night",
            "hour_of_day": 2,
            "deviation_score": 0.8 if event["type"] != "normal_activity" else 0.2,
            "is_new_ip_for_user": event["type"] in ["suspicious_login", "ssh_bruteforce"],
            "excessive_failed_logins": event["failures"] > 5
        }
    }


print("\n================ NEW TEST START ================\n")

for i, event in enumerate(events, 1):
    print(f"\n--- Event {i}: {event['type']} ---")

    incident = build_incident(event, i)
    result = run_ai_analysis(incident)
    analysis = result.get("ai_analysis")

    print("\n================ AI ANALYSIS ================\n")

    if not analysis:
        print("❌ AI Analysis Failed\n")
        continue

    print(f"📌 Summary: {analysis.get('summary', 'N/A')}")
    print("🎯 Attack Type:", analysis.get("attack_type", "N/A"))
    print("⚠️ Severity:", analysis.get("severity", "N/A"))

    print("\n🔍 Indicators:")
    for k in analysis.get("key_indicators", [])[:3]:
        print("  •", k)

    print("\n🧠 Analysis:", analysis.get("attack_analysis", "N/A"))

    print("\n💻 Assets:")
    for a in analysis.get("affected_assets", [])[:2]:
        print("  •", a)

    print("\n📈 Multi-stage:", analysis.get("is_multi_stage", "N/A"))
    print("💥 Impact:", analysis.get("impact", "N/A"))

    print("\n🛠 Actions:")
    for a in analysis.get("recommended_actions", [])[:3]:
        print("  •", a)

    print("\n============================================\n")

print("\n================ NEW TEST END ==================\n")
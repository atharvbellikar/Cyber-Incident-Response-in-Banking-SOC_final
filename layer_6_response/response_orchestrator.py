def run_response(event: dict) -> dict:
    """
    Adapter that parses the comprehensive event and builds 
    a frontend-safe response object without leaking internal Pydantic states.
    """
    ai_analysis = event.get("ai_analysis", {})
    cvss = event.get("cvss", {})
    cvss_severity = cvss.get("severity", "unknown").lower()
    
    # 1. Fallback 
    if not ai_analysis or cvss_severity == "unknown":
        return {
            "priority": "P3",
            "recommended_actions": ["Review event manually"],
            "containment_steps": [],
            "analyst_notes": "Limited context available from upstream layers."
        }
    
    # 2. Derive Priority from CVSS
    priority = "P3"
    if cvss_severity in ["critical", "high"]:
        priority = "P1"
    elif cvss_severity == "medium":
        priority = "P2"
        
    # 3. Formulate standard Frontend-Safe actions
    mitre = ai_analysis.get("intent", "").lower()
    vector = ai_analysis.get("attack_vector", "unknown").lower()
    
    recommended_actions = []
    containment_steps = []
    
    if priority == "P1":
        recommended_actions.append("Immediately escalate to Incident Response team.")
    else:
        recommended_actions.append("Review correlation anomalies.")
        
    if "network" in vector or "ssh" in mitre or "brute" in mitre:
        containment_steps.append("Block offender IP at edge firewall.")
    if "user" in mitre or "credential" in mitre:
        containment_steps.append("Force password reset and lock offending account.")
        
    if not containment_steps:
        containment_steps.append("Monitor host cautiously before taking action.")
        
    # 4. Generate Analyst Notes safely
    analyst_notes = ai_analysis.get("narrative", f"Incident grouped under {cvss_severity.upper()} severity constraints.")
    
    return {
        "priority": priority,
        "recommended_actions": recommended_actions,
        "containment_steps": containment_steps,
        "analyst_notes": analyst_notes
    }

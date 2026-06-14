import uuid
import copy

def format_pipeline_for_frontend(parsed_logs, layer1_output, layer2_output, layer3_output):
    """
    Format the pipeline outputs into a strict, predefined frontend contract.
    We iterate over the final layer3_output because it is cumulative and already 
    contains the embedded results from layers 1 and 2.
    """
    
    frontend_results = []
    
    for i, event in enumerate(layer3_output):
        
        event_dict = copy.deepcopy(event)
        
        if parsed_logs and len(parsed_logs) > i:
            raw_event = copy.deepcopy(parsed_logs[i])
        else:
            raw_event = event_dict.get("raw_event", {})
        
        # Determine event_id securely
        event_id = event_dict.get("raw_event", {}).get("log_id")
        if not event_id:
            event_id = str(uuid.uuid4())
            
        action = raw_event.get("action", "") or ""
        source_ip = raw_event.get("source_ip", "") or "unknown_ip"
        url_path = raw_event.get("url", "") or event_dict.get("destination_ip", "") or "target"
        
        detection_label = event_dict.get("detection", {}).get("label", "event")
        summary = f"{detection_label.capitalize()} {action} from {source_ip} targeting {url_path}"
            
        # The schema
        formatted = {
            "summary": summary,
            "event_id": event_id,
            "raw_event": raw_event,
            "ingestion": {},
            "feature_engineering": {},
            "detection": {},
            "anomaly_detection": {},
            "threat_analysis": {},
            "ioc_enrichment": {},
            "correlation_analysis": {},
            "cis": {},
            "ai_analysis": {},
            "cvss": {},
            "response": {},
            "final_report": {},
            "dashboard": {}
        }
        
        # Populate from layer output
        
        # Ingestion / Normalization fields
        ingestion_keys = [
            "timestamp", "source_ip", "dest_ip", "src_port", "dest_port", 
            "protocol", "action", "bytes_in", "bytes_out", "log_family",
            "url_path", "http_method", "http_status_code", "user_agent"
        ]
        for k in ingestion_keys:
            if k in event_dict:
                formatted["ingestion"][k] = event_dict.get(k)
                
        # Hard-extract web fields from raw inner block if present
        inner = raw_event.get("raw_event", {})
        if inner.get("method"):
            formatted["ingestion"]["http_method"] = inner.get("method")
        if inner.get("status_code"):
            formatted["ingestion"]["http_status_code"] = inner.get("status_code")
        if inner.get("user_agent"):
            formatted["ingestion"]["user_agent"] = inner.get("user_agent")
        if raw_event.get("url"):
            formatted["ingestion"]["url_path"] = raw_event.get("url")
                
        # Feature Engineering fields
        feature_blocks = [
            "temporal_features", "behavioral_features", "statistical_features", 
            "frequency_features", "pattern_features", "network_traffic_features", 
            "network_protocol_features", "user_profile", "identity_features",
            "classification_scores", "time_windows"
        ]
        for block in feature_blocks:
            if block in event_dict:
                formatted["feature_engineering"][block] = event_dict.get(block)
                
        # Always prefer raw log_type for display
        display_family = raw_event.get("log_type") or event_dict.get("log_family")
        formatted["feature_engineering"]["log_family"] = display_family
        formatted["ingestion"]["log_family"] = display_family
                
        # Detection
        formatted["detection"] = event_dict.get("detection", {})
        
        # Anomaly Detection
        formatted["anomaly_detection"] = event_dict.get("anomaly_detection", {})
        
        # Threat Analysis
        formatted["threat_analysis"] = event_dict.get("threat_analysis", {})
        
        # IOC Enrichment
        formatted["ioc_enrichment"] = event_dict.get("ioc_enrichment", {})
        
        # Correlation Analysis
        formatted["correlation_analysis"] = event_dict.get("correlation_analysis", {})
        
        # CIS Benchmark — Layer 3 emits {framework, retrieval_query, matched_benchmarks:[...]}
        # where the real control lives in matched_benchmarks[0]. The frontend reads
        # cis.title / cis.benchmark_id / cis.remediation at the TOP level, so promote
        # the best matched benchmark up while keeping the full list for the detail view.
        cis_block = event_dict.get("cis_benchmark", {}) or {}
        matched = cis_block.get("matched_benchmarks") or []
        if matched:
            top = matched[0] or {}
            formatted["cis"] = {
                **cis_block,
                "benchmark_id": top.get("benchmark_id"),
                "title": top.get("title"),
                "description": top.get("description"),
                "remediation": top.get("remediation"),
                "section": top.get("section"),
                "framework": top.get("framework") or cis_block.get("framework"),
                "matched_benchmarks": matched,
            }
        elif cis_block:
            # Routed to a domain engine but no catalog entry matched the signals
            # (e.g. the IoT catalog has no tags/keywords yet). Be honest rather
            # than fabricating a control.
            formatted["cis"] = {
                **cis_block,
                "benchmark_id": cis_block.get("benchmark_id") or "N/A",
                "title": cis_block.get("title") or "No specific CIS control matched",
                "description": cis_block.get("description") or "No catalog entry matched the detected signals for this event.",
                "remediation": cis_block.get("remediation") or "Review the event manually against the applicable CIS benchmark.",
            }
        else:
            # Event was not routed (unknown log family) — generic monitoring guidance.
            formatted["cis"] = {
                "benchmark_id": "CIS-16",
                "framework": "CIS Controls",
                "title": "Application Monitoring",
                "description": "Monitor web application access patterns",
                "remediation": "Review unusual access attempts to admin endpoints"
            }
            
        # Refine threat_type if weak
        if formatted["detection"].get("threat_type", "unknown") == "unknown":
            raw_url = raw_event.get("url", "") or ""
            raw_action = raw_event.get("action", "") or ""
            if "admin" in raw_url:
                formatted["detection"]["threat_type"] = "web_attack"
            elif "scan" in raw_action:
                formatted["detection"]["threat_type"] = "reconnaissance"
            else:
                formatted["detection"]["threat_type"] = "suspicious_activity"
        
        # Initialize Advisor Agent fields
        formatted = add_advisor_agent_to_event(formatted)
        
        frontend_results.append(formatted)
        
    return {
        "status": "success",
        "total_events": len(frontend_results),
        "events": frontend_results
    }

def build_dashboard_block(event: dict) -> dict:
    """
    Build the compact 'dashboard' summary block the frontend header / incident
    detail views read directly (alert_title, severity, cvss_score, source_ip,
    affected_user). Call this AFTER cvss/response enrichment so the severity and
    score reflect the final CVSS result. All values are derived from the event.
    """
    raw = event.get("raw_event", {}) or {}
    detection = event.get("detection", {}) or {}
    cvss = event.get("cvss", {}) or {}
    ai = event.get("ai_analysis", {}) or {}

    severity = str(cvss.get("severity") or detection.get("severity") or "low").lower()
    threat = str(detection.get("threat_type") or "event").replace("_", " ").title()
    alert_title = event.get("summary") or ai.get("intent") or f"{threat} Detected"

    return {
        "alert_title": alert_title,
        "severity": severity,                       # canonical, CVSS-derived
        "threat_type": detection.get("threat_type") or "unknown",
        "cvss_score": cvss.get("base_score") or 0,
        "source_ip": raw.get("source_ip") or "unknown",
        "affected_user": raw.get("affected_user") or raw.get("user") or raw.get("affected_host") or "unknown",
    }


def build_final_report(event: dict) -> dict:
    """
    Build the 'final_report' block (owner / status / timeline / summary) shown on
    the incident Report view. Previously left as {} so the UI rendered an empty
    object and 'N/A' owner/status. All values are derived from the enriched event.
    Call AFTER cvss/response enrichment.
    """
    detection = event.get("detection", {}) or {}
    cvss = event.get("cvss", {}) or {}
    cis = event.get("cis", {}) or {}
    ai = event.get("ai_analysis", {}) or {}
    response = event.get("response", {}) or {}

    severity = str(cvss.get("severity") or detection.get("severity") or "low").lower()
    owner = "SOC Tier-2" if severity in ("high", "critical") else "SOC Tier-1"

    threat = str(detection.get("threat_type") or "activity").replace("_", " ")
    timeline = [
        "Telemetry ingested & normalized (Layer 1)",
        f"Detection: {threat} (confidence {round(float(detection.get('confidence') or 0) * 100)}%) (Layer 2)",
    ]
    if cis.get("benchmark_id"):
        timeline.append(f"CIS control mapped: {cis.get('benchmark_id')} — {cis.get('title')} (Layer 3)")
    timeline.append(f"CVSS scored: {cvss.get('base_score', 'N/A')} ({severity}) (Layer 5)")
    if response.get("priority"):
        timeline.append(f"Response prioritized: {response.get('priority')} (Layer 6)")
    timeline.append("Awaiting analyst review")

    return {
        "owner": owner,
        "status": str(event.get("status") or "open").lower(),
        "priority": response.get("priority") or "P3",
        "summary": ai.get("summary") or event.get("summary") or "",
        "timeline": timeline,
    }


def add_advisor_agent_to_event(event):
    detection = event.get("detection") or {}
    threat_analysis = event.get("threat_analysis") or {}
    cis = event.get("cis") or {}
    ai = event.get("ai_analysis") or {}
    resp = event.get("response") or {}
    
    # Extract values
    benchmark_id = cis.get("benchmark_id") or "CIS-16"
    benchmark_title = cis.get("title") or "Application Monitoring"
    matched_domain = cis.get("framework") or "CIS Controls"
    
    # Recommendation
    recommendation = ""
    if resp.get("recommended_actions"):
        recommendation = " | ".join(resp.get("recommended_actions"))
    elif cis.get("remediation"):
        recommendation = cis.get("remediation")
    else:
        recommendation = "Establish appropriate security monitoring and isolation controls."
        
    # Rationale
    rationale = ai.get("narrative") or cis.get("description") or "No detailed rationale available."
    
    # Confidence
    confidence = float(detection.get("confidence") or threat_analysis.get("confidence") or 0.7)
    
    # CVSS
    impact = ai.get("impact") or {}
    cvss_handoff = {
        "attack_vector": ai.get("attack_vector") or "network",
        "attack_complexity": ai.get("attack_complexity") or "low",
        "privileges_required": ai.get("privileges_required") or "none",
        "user_interaction": ai.get("user_interaction") or "none",
        "scope": ai.get("scope") or "unchanged",
        "confidentiality_impact": impact.get("confidentiality") or "low",
        "integrity_impact": impact.get("integrity") or "low",
        "availability_impact": impact.get("availability") or "low",
        "suggested_severity": detection.get("severity") or "medium",
        "requires_cvss_layer_validation": True
    }
    
    advisor_agent = {
        "agent_name": "SENTRA CIS-CVSS Advisor",
        "agent_type": "recommendation_agent",
        "input_layers": ["layer_2_detection", "layer_3_cis_mapping"],
        "cis_recommendation": {
            "benchmark_id": benchmark_id,
            "benchmark_title": benchmark_title,
            "matched_domain": matched_domain,
            "recommendation": recommendation,
            "rationale": rationale,
            "confidence": confidence
        },
        "cvss_handoff": cvss_handoff,
        "next_layer_status": {
            "cvss_ready": True,
            "response_ready": True
        }
    }
    
    event["advisor_agent"] = advisor_agent
    return event


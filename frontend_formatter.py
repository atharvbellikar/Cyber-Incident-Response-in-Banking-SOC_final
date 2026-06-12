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
        
        # CIS Benchmark
        formatted["cis"] = event_dict.get("cis_benchmark", {})
        if not formatted["cis"]:
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
        
        frontend_results.append(formatted)
        
    return {
        "status": "success",
        "total_events": len(frontend_results),
        "events": frontend_results
    }

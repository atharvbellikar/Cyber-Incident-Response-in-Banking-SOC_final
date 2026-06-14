import json
import logging
from pathlib import Path

from layer_1_feature_engineering.ingestion_orchestrator import process_json_text
from layer_2_detection.detection_orchestrator import run_detection_batch
from layer_3_cis.orchestrator import run_layer3

logging.basicConfig(level=logging.INFO)


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    base_dir = Path(__file__).resolve().parent

    input_file = base_dir / "layer_1_feature_engineering" / "sample_logs.json"
    layer1_output_path = base_dir / "layer1_output.json"
    layer2_output_path = base_dir / "layer2_output.json"
    layer3_output_path = base_dir / "layer3_output.json"
    root_frontend_output_path = base_dir / "frontend_output.json"
    frontend_public_output_path = base_dir / "Frontend" / "public" / "frontend_output.json"

    print("Reading sample logs...")
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    layer1_result = []
    print("Running Layer 1...")
    normalized_records = process_json_text(content)
    print("Input logs count:", len(normalized_records))

    from layer_1_feature_engineering.feature_orchestrator import run_feature_engineering
    from layer_1_feature_engineering.state_reset import reset_feature_state

    reset_feature_state()
    for rec in normalized_records:
        layer1_result.append(run_feature_engineering(rec))

    _write_json(layer1_output_path, layer1_result)

    print("Running Layer 2...")
    layer2_output = run_detection_batch(layer1_result)
    _write_json(layer2_output_path, layer2_output)

    print("Running Layer 3...")
    layer3_output = run_layer3(layer2_output)
    _write_json(layer3_output_path, layer3_output)

    print("Running Frontend Formatter...")
    from frontend_formatter import format_pipeline_for_frontend

    frontend_output = format_pipeline_for_frontend(
        parsed_logs=None,
        layer1_output=layer1_result,
        layer2_output=layer2_output,
        layer3_output=layer3_output,
    )

    print("Enriching with AI Analysis (Parallel), CVSS, and Response...")
    from layer_4_ai_analysis.incident_report_builder import run_layer4
    from layer_5_cvss.cvss_orchestrator import run_cvss
    from layer_6_response.response_orchestrator import run_response
    from frontend_formatter import build_dashboard_block, build_final_report

    enriched_events = run_layer4(frontend_output["events"])

    for event in enriched_events:
        event["cvss"] = run_cvss(event["ai_analysis"])
        event["response"] = run_response(event)
        event["dashboard"] = build_dashboard_block(event)
        event["final_report"] = build_final_report(event)

    frontend_output["events"] = enriched_events

    _write_json(root_frontend_output_path, frontend_output)
    _write_json(frontend_public_output_path, frontend_output)

    # Save to SQLite Database
    print("Saving to SQLite database...")
    from db_manager import init_db, save_incident
    init_db()
    for event in enriched_events:
        save_incident(event)

    print("Pipeline completed gracefully! Check the output files:")
    print(f"- {layer1_output_path}")
    print(f"- {layer2_output_path}")
    print(f"- {layer3_output_path}")
    print(f"- {root_frontend_output_path}")
    print(f"- {frontend_public_output_path}")


if __name__ == "__main__":
    main()
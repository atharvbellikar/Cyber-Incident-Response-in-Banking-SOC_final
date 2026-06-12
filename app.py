from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Union
import os

# Parsers & Normalization
from layer_1_feature_engineering.ingestion_orchestrator import (
    process_json_text,
    process_jsonl_text,
    process_records,
)

# Layer 1
from layer_1_feature_engineering.feature_orchestrator import run_feature_engineering

# Layer 2
from layer_2_detection.detection_orchestrator import run_detection_batch

# Layer 3
from layer_3_cis.orchestrator import run_layer3

app = FastAPI(
    title="SOC Pipeline API",
    description="Full SOC Pipeline: Ingestion -> Feature Extraction -> Detection -> CIS Context"
)

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "soc-pipeline-api"
    }

from frontend_formatter import format_pipeline_for_frontend

def run_soc_pipeline(normalized_records: list) -> list:
    """Takes normalized records, pushes through Layer 1, 2 & 3, returns frontend-ready output."""
    
    # Layer 1: Feature Extraction
    layer1_output = [run_feature_engineering(rec) for rec in normalized_records]
    
    # Layer 2: Detection
    layer2_output = run_detection_batch(layer1_output)
    
    # Layer 3: CIS Benchmark Lookup
    layer3_output = run_layer3(layer2_output)
    
    # Formatter Contract Hook
    frontend_output = format_pipeline_for_frontend(
        parsed_logs=None, # Extracted dynamically from layered output
        layer1_output=layer1_output, 
        layer2_output=layer2_output, 
        layer3_output=layer3_output
    )
    
    return frontend_output

@app.post("/ingest/text")
def ingest_text(payload: Any = Body(...)):
    try:
        # Accept upload/input & Call parser/normalizer
        if isinstance(payload, str):
            normalized_records = process_json_text(payload)
        elif isinstance(payload, dict):
            normalized_records = process_records([payload])
        elif isinstance(payload, list):
            if not all(isinstance(item, dict) for item in payload):
                raise HTTPException(status_code=400, detail="Body list must contain JSON objects only")
            normalized_records = process_records(payload)
        else:
            raise HTTPException(status_code=400, detail="Unsupported request body format")

        layer3_output = run_soc_pipeline(normalized_records)

        return JSONResponse(content={
            "status": "success",
            "source": "raw_text_payload",
            "total_records": len(normalized_records),
            "pipeline_results": layer3_output
        })

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/ingest/file")
async def ingest_file(files: List[UploadFile] = File(...)):
    results = []

    for file in files:
        filename = file.filename or "uploaded_file"
        ext = os.path.splitext(filename)[1].lower()

        if ext not in {".json", ".jsonl"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format for {filename}. Please change the format to JSON or JSONL."
            )

        content_bytes = await file.read()

        try:
            content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail=f"{filename} is not valid UTF-8 text")

        try:
            # Accept upload/input & Call parser/normalizer
            if ext == ".json":
                normalized_records = process_json_text(content)
            else:
                normalized_records = process_jsonl_text(content)

            layer3_output = run_soc_pipeline(normalized_records)

            results.append({
                "filename": filename,
                "total_records": len(normalized_records),
                "pipeline_results": layer3_output
            })

        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"{filename}: {str(e)}")

    return JSONResponse(content={
        "status": "success",
        "files_processed": len(results),
        "results": results
    })
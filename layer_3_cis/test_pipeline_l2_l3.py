import json
from layer_3_cis.orchestrator import run_layer3

with open("output_detection.json", "r", encoding="utf-8") as f:
    layer2_output = json.load(f)

layer3_output = run_layer3(layer2_output)

print(json.dumps(layer3_output[:2], indent=2))

with open("output_layer3.json", "w", encoding="utf-8") as f:
    json.dump(layer3_output, f, indent=2)

print("Layer 3 output saved to output_layer3.json")
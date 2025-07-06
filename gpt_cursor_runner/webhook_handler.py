import os
import json
from datetime import datetime

def process_hybrid_block(data):
    # Timestamped filename to avoid collisions
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_dir = "patches"
    os.makedirs(out_dir, exist_ok=True)

    # Try to extract some ID or role name
    label = data.get("id") or data.get("role") or "hybrid_patch"
    filename = f"{label}_{timestamp}.json"
    path = os.path.join(out_dir, filename)

    with open(path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Patch saved to: {path}")
    return path


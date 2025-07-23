#!/bin/bash
# ghost-sync-index: regenerate manifest-auto.json from real .md summaries
summary_path='/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries'
index_out='/Users/sawyer/gitSync/.cursor-cache/MAIN/manifest-auto.json'

# Use Python to create the manifest
python3 -c "
import json
import os
import glob

files = sorted(glob.glob(os.path.join('$summary_path', '*.md')))
manifest = [{'file': f} for f in files]

with open('$index_out', 'w') as f:
    json.dump(manifest, f, indent=2)
" 
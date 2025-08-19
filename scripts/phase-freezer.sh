#!/bin/bash
PHASE=$1
OUT="/Users/sawyer/gitSync/_backups/$(date +%Y%m%d-UTC)_v3.1.0-${PHASE}_phase-frozen.tar.gz"
tar -czf $OUT . && echo "[FREEZER] Phase ${PHASE} frozen to $OUT" 

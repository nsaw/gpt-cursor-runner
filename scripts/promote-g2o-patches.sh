#!/usr/bin/env bash
set -euo pipefail

# G2o Patch Promotion Script
# Copies staged patches from G2o/P* folders to root queue in strict execution order

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STAGING_DIR="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o"
ROOT_QUEUE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
LOG_FILE="/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/promotion.log"

# Ensure directories exist
mkdir -p "$ROOT_QUEUE" "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "$(date '+%Y-%m-%dT%H:%M:%S%z'): $*" | tee -a "$LOG_FILE"
}

# Clean root queue (backup existing)
if [ -d "$ROOT_QUEUE" ] && [ "$(ls -A "$ROOT_QUEUE" 2>/dev/null | grep -E '\.json$' | wc -l)" -gt 0 ]; then
    BACKUP_DIR="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/backup-$(date +%Y%m%d_%H%M%S)"
    log "Backing up existing patches to $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    mv "$ROOT_QUEUE"/*.json "$BACKUP_DIR/" 2>/dev/null || true
fi

# Phase execution order (from audit report)
PHASES=("P0" "P1" "P2" "P3" "P4" "P5" "P6" "P7" "P8")

log "Starting G2o patch promotion..."

TOTAL_PROMOTED=0

for phase in "${PHASES[@]}"; do
    phase_dir="$STAGING_DIR/$phase"
    
    if [ ! -d "$phase_dir" ]; then
        log "Warning: Phase directory $phase_dir not found, skipping"
        continue
    fi
    
    log "Processing phase $phase..."
    
    # Get all JSON patches in phase directory, sorted by version
    patches=($(find "$phase_dir" -name "*.json" -type f | sort))
    
    if [ ${#patches[@]} -eq 0 ]; then
        log "No patches found in $phase"
        continue
    fi
    
    for patch in "${patches[@]}"; do
        filename=$(basename "$patch")
        
        # Skip non-patch files
        if [[ ! "$filename" =~ ^patch-v[0-9]+\.[0-9]+\.[0-9]+\(P[0-9]+\.[0-9]+\.[0-9]+\)_.*\.json$ ]]; then
            log "Skipping non-patch file: $filename"
            continue
        fi
        
        # Copy to root queue
        cp "$patch" "$ROOT_QUEUE/"
        log "Promoted: $filename"
        ((TOTAL_PROMOTED++))
    done
    
    # Update phase INDEX.md and README.md
    if [ -f "$phase_dir/INDEX.md" ]; then
        log "Updating $phase/INDEX.md"
        # Mark all patches as promoted
        sed -i '' 's/\[ \]/[x]/g' "$phase_dir/INDEX.md" 2>/dev/null || true
    fi
    
    if [ -f "$phase_dir/README.md" ]; then
        log "Updating $phase/README.md"
        # Add promotion timestamp
        echo "" >> "$phase_dir/README.md"
        echo "**Promoted to root queue**: $(date '+%Y-%m-%dT%H:%M:%S%z')" >> "$phase_dir/README.md"
    fi
done

# Create root queue INDEX.md
log "Creating root queue INDEX.md"
cat > "$ROOT_QUEUE/INDEX.md" << 'EOF'
# G2o Root Queue Index
*Generated: $(date '+%Y-%m-%dT%H:%M:%S%z')*

## Promoted Patches

This directory contains patches promoted from G2o staging areas in execution order.

### Execution Order
Patches are executed in the following order based on their version numbers:

EOF

# List promoted patches in order
find "$ROOT_QUEUE" -name "*.json" -type f | sort | while read -r patch; do
    filename=$(basename "$patch")
    echo "- \`$filename\`" >> "$ROOT_QUEUE/INDEX.md"
done

echo "" >> "$ROOT_QUEUE/INDEX.md"
echo "### Total Patches: $TOTAL_PROMOTED" >> "$ROOT_QUEUE/INDEX.md"
echo "" >> "$ROOT_QUEUE/INDEX.md"
echo "### Promotion Log" >> "$ROOT_QUEUE/INDEX.md"
echo "See: \`$LOG_FILE\`" >> "$ROOT_QUEUE/INDEX.md"

# Validate promotion
PROMOTED_COUNT=$(find "$ROOT_QUEUE" -name "*.json" -type f | wc -l | tr -d ' ')
log "Promotion complete: $PROMOTED_COUNT patches in root queue"

# Check for any JSON parsing errors
log "Validating JSON files..."
for patch in "$ROOT_QUEUE"/*.json; do
    if [ -f "$patch" ]; then
        if ! python3 -m json.tool "$patch" >/dev/null 2>&1; then
            log "ERROR: Invalid JSON in $(basename "$patch")"
            exit 1
        fi
    fi
done

log "All JSON files validated successfully"

# Final status
echo ""
echo "✅ G2o Patch Promotion Complete"
echo "📁 Root Queue: $ROOT_QUEUE"
echo "📊 Total Patches: $PROMOTED_COUNT"
echo "📝 Log: $LOG_FILE"
echo ""
echo "Next Steps:"
echo "1. Review promoted patches in root queue"
echo "2. Execute patches in order using patch-executor-loop"
echo "3. Monitor execution logs and summaries"

#!/bin/bash

# Cleanup Summary Markdown Files
# Migrates remaining summary markdown files to JSON log format

set -e

# Configuration
SUMMARIES_DIR="summaries"
BACKUP_DIR="summaries/backup-$(date +%Y%m%d_%H%M%S)"
LOG_FILE="logs/cleanup-summary-markdown.log"
JSON_LOG_FILE="logs/summary-events.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "info") echo -e "${BLUE}[${timestamp}] ℹ️  ${message}${NC}" ;;
        "success") echo -e "${GREEN}[${timestamp}] ✓ ${message}${NC}" ;;
        "warning") echo -e "${YELLOW}[${timestamp}] ⚠️  ${message}${NC}" ;;
        "error") echo -e "${RED}[${timestamp}] ❌ ${message}${NC}" ;;
    esac
    
    # Also log to file
    echo "[${timestamp}] ${message}" >> "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log "info" "Starting summary markdown cleanup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"
log "info" "Created backup directory: $BACKUP_DIR"

# Initialize JSON log if it doesn't exist
if [ ! -f "$JSON_LOG_FILE" ]; then
    cat > "$JSON_LOG_FILE" << EOF
{
  "events": [],
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "total_events": 0,
  "migration_completed": false
}
EOF
    log "info" "Created JSON log file: $JSON_LOG_FILE"
fi

# Function to convert markdown to JSON
convert_markdown_to_json() {
    local file="$1"
    local filename=$(basename "$file")
    local content=$(cat "$file")
    local timestamp=$(date -r "$file" -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    
    # Extract metadata from filename
    local event_type="summary"
    local patch_id="unknown"
    
    # Try to extract patch ID from filename
    if [[ "$filename" =~ ([a-zA-Z0-9_-]+)_[0-9]{8}_[0-9]{6}\.md ]]; then
        patch_id="${BASH_REMATCH[1]}"
    elif [[ "$filename" =~ ([a-zA-Z0-9_-]+)\.md ]]; then
        patch_id="${BASH_REMATCH[1]}"
    fi
    
    # Create JSON event
    cat >> "$JSON_LOG_FILE.tmp" << EOF
    {
      "id": "summary_$(date +%s)_$(basename "$file" .md)",
      "type": "summary_event",
      "event_type": "$event_type",
      "timestamp": "$timestamp",
      "patch_id": "$patch_id",
      "filename": "$filename",
      "content": $(echo "$content" | jq -R -s .),
      "migrated_from": "markdown"
    }
EOF
}

# Process all markdown files
if [ -d "$SUMMARIES_DIR" ]; then
    log "info" "Scanning for markdown files in $SUMMARIES_DIR..."
    
    # Find all .md files
    md_files=$(find "$SUMMARIES_DIR" -name "*.md" -type f)
    total_files=$(echo "$md_files" | wc -l)
    
    if [ "$total_files" -eq 0 ]; then
        log "success" "No markdown files found to migrate"
    else
        log "info" "Found $total_files markdown files to migrate"
        
        # Create temporary JSON file
        cp "$JSON_LOG_FILE" "$JSON_LOG_FILE.tmp"
        
        # Process each file
        count=0
        for file in $md_files; do
            count=$((count + 1))
            log "info" "Processing file $count/$total_files: $(basename "$file")"
            
            # Convert to JSON
            if convert_markdown_to_json "$file"; then
                # Move to backup
                mv "$file" "$BACKUP_DIR/"
                log "success" "Migrated and backed up: $(basename "$file")"
            else
                log "error" "Failed to convert: $(basename "$file")"
            fi
        done
        
        # Update JSON log
        if [ -f "$JSON_LOG_FILE.tmp" ]; then
            # Add comma before new events if there are existing events
            if [ "$(jq '.events | length' "$JSON_LOG_FILE")" -gt 0 ]; then
                # Insert new events at the beginning
                jq --argjson newEvents "$(cat "$JSON_LOG_FILE.tmp")" \
                   '.events = $newEvents + .events | .last_updated = now | .total_events = (.events | length)' \
                   "$JSON_LOG_FILE" > "$JSON_LOG_FILE.new"
                mv "$JSON_LOG_FILE.new" "$JSON_LOG_FILE"
            else
                # Replace with new content
                mv "$JSON_LOG_FILE.tmp" "$JSON_LOG_FILE"
            fi
            
            # Update migration status
            jq '.migration_completed = true' "$JSON_LOG_FILE" > "$JSON_LOG_FILE.tmp"
            mv "$JSON_LOG_FILE.tmp" "$JSON_LOG_FILE"
        fi
        
        log "success" "Migration completed: $count files processed"
    fi
else
    log "warning" "Summaries directory not found: $SUMMARIES_DIR"
fi

# Create summary report
cat > "summaries/migration-report.md" << EOF
# Summary Markdown Migration Report

**Date:** $(date)
**Migration Status:** Completed

## Summary
- **Files Processed:** $count
- **Backup Location:** $BACKUP_DIR
- **JSON Log:** $JSON_LOG_FILE
- **Migration Completed:** $(date)

## Files Migrated
$(find "$BACKUP_DIR" -name "*.md" -exec basename {} \; | sort)

## Next Steps
1. Verify JSON log contains all migrated content
2. Update any references to old markdown files
3. Consider removing backup directory after verification

## JSON Log Structure
The migrated content is now stored in JSON format with the following structure:
\`\`\`json
{
  "events": [
    {
      "id": "summary_timestamp_filename",
      "type": "summary_event",
      "event_type": "summary",
      "timestamp": "ISO8601",
      "patch_id": "extracted_from_filename",
      "filename": "original_filename.md",
      "content": "markdown_content",
      "migrated_from": "markdown"
    }
  ],
  "last_updated": "ISO8601",
  "total_events": 0,
  "migration_completed": true
}
\`\`\`
EOF

log "success" "Migration report created: summaries/migration-report.md"

# Final status
log "success" "Summary markdown cleanup completed successfully"
log "info" "Backup directory: $BACKUP_DIR"
log "info" "JSON log file: $JSON_LOG_FILE"
log "info" "Migration report: summaries/migration-report.md"

echo ""
echo "✅ Summary markdown cleanup completed!"
echo "📁 Backup: $BACKUP_DIR"
echo "📊 JSON Log: $JSON_LOG_FILE"
echo "📋 Report: summaries/migration-report.md" 
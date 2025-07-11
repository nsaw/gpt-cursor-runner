#!/bin/bash

# GHOST Patch Retry Script
# Scans for stalled patches and retries them with fallback escalation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_ROOT/logs/retry"
SUMMARIES_DIR="$PROJECT_ROOT/summaries"
PATCHES_DIR="$PROJECT_ROOT/patches"
FAILED_DIR="$PROJECT_ROOT/patches/failed"

# Ensure directories exist
mkdir -p "$LOGS_DIR"
mkdir -p "$SUMMARIES_DIR"
mkdir -p "$FAILED_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Generate summary filename
generate_summary_filename() {
    local timestamp=$(date +'%Y%m%d_%H%M%S')
    echo "summary-ghost-retry-${timestamp}.md"
}

# Write summary to file
write_summary() {
    local summary_file="$1"
    local content="$2"
    
    cat > "$SUMMARIES_DIR/$summary_file" << EOF
# GHOST Patch Retry Summary

**Timestamp:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')
**Script:** retry-stalled-patches.sh
**Status:** $3

## Details

$content

## Actions Taken

- Scanned patches directory for stalled patches
- Attempted retry with patch_runner.py
- Escalated to GitHub fallback on 3rd failure
- Logged all attempts to logs/retry/

## Next Steps

- Monitor logs/retry/ for retry attempts
- Check GitHub for fallback patches
- Review failed patches in patches/failed/
EOF
}

# Check if patch is stalled
is_patch_stalled() {
    local patch_file="$1"
    
    if [[ ! -f "$patch_file" ]]; then
        return 1
    fi
    
    # Check for ghost-stall flag
    if jq -e '.ghost-stall == true' "$patch_file" >/dev/null 2>&1; then
        return 0
    fi
    
    # Check for old patches (older than 1 hour without completion)
    local patch_age=$(($(date +%s) - $(stat -f %m "$patch_file" 2>/dev/null || echo 0)))
    if [[ $patch_age -gt 3600 ]]; then
        # Check if it's not in completed state
        if ! jq -e '.status == "completed"' "$patch_file" >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    return 1
}

# Retry a single patch
retry_patch() {
    local patch_file="$1"
    local retry_count="$2"
    local log_file="$LOGS_DIR/ghost_$(date +'%Y%m%d_%H%M%S').log"
    
    log "Retrying patch: $patch_file (attempt $retry_count)"
    
    # Run patch_runner.py with the patch file
    if python3 -m gpt_cursor_runner.patch_runner --patch-file "$patch_file" > "$log_file" 2>&1; then
        success "Patch retry successful: $patch_file"
        return 0
    else
        error "Patch retry failed: $patch_file (attempt $retry_count)"
        return 1
    fi
}

# Escalate to GitHub fallback
escalate_to_github() {
    local patch_file="$1"
    local log_file="$LOGS_DIR/ghost_github_$(date +'%Y%m%d_%H:%M:%S').log"
    
    log "Escalating to GitHub fallback: $patch_file"
    
    if "$SCRIPT_DIR/send-fallback-to-github.sh" "$patch_file" > "$log_file" 2>&1; then
        success "GitHub fallback successful: $patch_file"
        return 0
    else
        error "GitHub fallback failed: $patch_file"
        return 1
    fi
}

# Move patch to failed directory
move_to_failed() {
    local patch_file="$1"
    local failed_file="$FAILED_DIR/$(basename "$patch_file")"
    
    log "Moving to failed directory: $patch_file"
    mv "$patch_file" "$failed_file"
}

# Main retry logic
main() {
    local summary_file=$(generate_summary_filename)
    local retry_count=0
    local total_patches=0
    local successful_retries=0
    local failed_retries=0
    local escalated_patches=0
    local summary_content=""
    
    log "Starting GHOST patch retry scan..."
    
    # Find all patch files
    local patch_files=()
    while IFS= read -r -d '' file; do
        patch_files+=("$file")
    done < <(find "$PATCHES_DIR" -name "*.json" -type f -print0 2>/dev/null)
    
    if [[ ${#patch_files[@]} -eq 0 ]]; then
        log "No patch files found in $PATCHES_DIR"
        summary_content="No patch files found to process."
        write_summary "$summary_file" "$summary_content" "NO_PATCHES"
        return 0
    fi
    
    log "Found ${#patch_files[@]} patch files to scan"
    
    for patch_file in "${patch_files[@]}"; do
        if is_patch_stalled "$patch_file"; then
            total_patches=$((total_patches + 1))
            log "Found stalled patch: $patch_file"
            
            # Try up to 3 times
            local patch_success=false
            for retry_count in 1 2 3; do
                if retry_patch "$patch_file" "$retry_count"; then
                    successful_retries=$((successful_retries + 1))
                    patch_success=true
                    break
                fi
                
                if [[ $retry_count -eq 3 ]]; then
                    failed_retries=$((failed_retries + 1))
                    log "All retry attempts failed for: $patch_file"
                    
                    # Escalate to GitHub
                    if escalate_to_github "$patch_file"; then
                        escalated_patches=$((escalated_patches + 1))
                        patch_success=true
                    else
                        # Move to failed directory
                        move_to_failed "$patch_file"
                    fi
                fi
            done
            
            if [[ "$patch_success" == "false" ]]; then
                summary_content+="- **FAILED:** $patch_file (all retries + GitHub fallback failed)\n"
            else
                summary_content+="- **SUCCESS:** $patch_file (retry or GitHub fallback succeeded)\n"
            fi
        fi
    done
    
    # Generate summary
    summary_content="**Total patches scanned:** ${#patch_files[@]}\n"
    summary_content+="**Stalled patches found:** $total_patches\n"
    summary_content+="**Successful retries:** $successful_retries\n"
    summary_content+="**Failed retries:** $failed_retries\n"
    summary_content+="**Escalated to GitHub:** $escalated_patches\n\n"
    summary_content+="## Patch Details\n\n"
    
    local status="COMPLETED"
    if [[ $failed_retries -gt 0 ]]; then
        status="PARTIAL_FAILURE"
    fi
    
    write_summary "$summary_file" "$summary_content" "$status"
    
    log "Retry scan completed:"
    log "  - Total patches: ${#patch_files[@]}"
    log "  - Stalled patches: $total_patches"
    log "  - Successful retries: $successful_retries"
    log "  - Failed retries: $failed_retries"
    log "  - Escalated to GitHub: $escalated_patches"
    log "  - Summary written to: $SUMMARIES_DIR/$summary_file"
}

# Run main function
main "$@" 
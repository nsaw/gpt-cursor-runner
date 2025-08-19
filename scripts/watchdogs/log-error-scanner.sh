#!/bin/bash

LOG_DIR="/Users/sawyer/gitSync/gpt-cursor-runner/logs"
TARGET_LOG="$LOG_DIR/watchdog-logscan.log"
MAX_LOG_SIZE="100M"  # Maximum log file size before rotation

ERROR_PATTERNS="ECONNREFUSED|EADDRINUSE|CRASH|FATAL|UnhandledPromise|Exception|Segfault"

# Function to rotate log file if it gets too large
rotate_log() {
    if [ -f "$TARGET_LOG" ]; then
        local size=$(stat -f%z "$TARGET_LOG" 2>/dev/null || echo 0)
        local max_size=$(numfmt --from=iec $MAX_LOG_SIZE 2>/dev/null || echo 104857600)  # 100MB default
        
        if [ "$size" -gt "$max_size" ]; then
            mv "$TARGET_LOG" "${TARGET_LOG}.$(date +%Y%m%d_%H%M%S).bak"
            touch "$TARGET_LOG"
            echo "$(date): Log rotated due to size limit" >> "$TARGET_LOG"
        fi
    fi
}

# Function to deduplicate recent errors
deduplicate_errors() {
    if [ -f "$TARGET_LOG" ]; then
        # Keep only the last 1000 unique error lines
        tail -n 1000 "$TARGET_LOG" | sort -u > "${TARGET_LOG}.tmp" && mv "${TARGET_LOG}.tmp" "$TARGET_LOG"
    fi
}

echo "$(date): Log error scanner watchdog started" >> "$TARGET_LOG"

while true; do
    # Rotate log if needed
    rotate_log
    
    # Scan for errors but limit output
    error_count=0
    for file in $LOG_DIR/*.log; do
        if [ -f "$file" ] && [ "$file" != "$TARGET_LOG" ]; then
            # Only scan files modified in the last hour to avoid infinite loops
            if [ $(find "$file" -mmin -60 2>/dev/null | wc -l) -gt 0 ]; then
                # Limit to 10 new errors per file per cycle
                new_errors=$(grep -E "$ERROR_PATTERNS" "$file" 2>/dev/null | head -n 10 || true)
                if [ -n "$new_errors" ]; then
                    echo "$(date): Errors found in $(basename "$file"):" >> "$TARGET_LOG"
                    echo "$new_errors" >> "$TARGET_LOG"
                    error_count=$((error_count + 1))
                fi
            fi
        fi
    done
    
    # Deduplicate every 10 cycles to prevent log bloat
    if [ $((RANDOM % 10)) -eq 0 ]; then
        deduplicate_errors
    fi
    
    # Log summary
    if [ $error_count -gt 0 ]; then
        echo "$(date): Found errors in $error_count files" >> "$TARGET_LOG"
    fi
    
    sleep 30  # Increased from 10 to 30 seconds to reduce frequency
done 

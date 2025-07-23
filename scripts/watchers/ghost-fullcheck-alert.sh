#!/bin/bash
log_in="/Users/sawyer/gitSync/tm-mobile-cursor/.ghost-runner-fullcheck.log"
alert_out="/Users/sawyer/gitSync/gpt-cursor-runner/.ghost-alerts.log"
tail -n 20 "$log_in" | grep -E '❌|not running|missing|dead|exit' >> "$alert_out" 
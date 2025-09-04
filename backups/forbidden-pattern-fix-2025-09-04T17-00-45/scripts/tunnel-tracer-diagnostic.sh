#!/bin/bash

# Cloudflare Tunnel Payload Routing Diagnostic
# Tests if POST payloads are reaching Flask through the tunnel

TRACE_LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/tunnel-trace-diagnostic.log"
LOG_DIR="$(dirname "$TRACE_LOG")"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

echo "=== CLOUDFLARE TUNNEL PAYLOAD ROUTING DIAGNOSTIC ===" | tee -a "$TRACE_LOG"
echo "Timestamp: $(date)" | tee -a "$TRACE_LOG"
echo "Tunnel ID: 9401ee23-3a46-409b-b0e7-b035371afe32" | tee -a "$TRACE_LOG"
echo "Target: https://webhook-thoughtmarks.thoughtmarks.app/webhook" | tee -a "$TRACE_LOG"
echo "" | tee -a "$TRACE_LOG"

# Test 1: Basic tunnel connectivity
echo "[TEST 1] Basic tunnel connectivity..." | tee -a "$TRACE_LOG"
# MIGRATED: { timeout 30 curl -s -I https://webhook-thoughtmarks.thoughtmarks.app/webhook & } >/dev/null 2>&1 & disown
node scripts/nb.js --ttl 30 --label curl --log validations/logs/curl.log --status validations/status -- curl -s -I https://webhook-thoughtmarks.thoughtmarks.app/webhook
sleep 5
curl -s -I https://webhook-thoughtmarks.thoughtmarks.app/webhook | tee -a "$TRACE_LOG"
echo "" | tee -a "$TRACE_LOG"

# Test 2: POST with minimal payload
echo "[TEST 2] POST with minimal payload..." | tee -a "$TRACE_LOG"
MINIMAL_PAYLOAD='{"test":"minimal","timestamp":"'$(date +%s)'"}'
{ timeout 30 curl -s -X POST -H 'Content-Type: application/json' \
  -d "$MINIMAL_PAYLOAD" \
  https://webhook-thoughtmarks.thoughtmarks.app/webhook & } >/dev/null 2>&1 & disown
sleep 5
curl -s -X POST -H 'Content-Type: application/json' \
  -d "$MINIMAL_PAYLOAD" \
  https://webhook-thoughtmarks.thoughtmarks.app/webhook | tee -a "$TRACE_LOG"
echo "" | tee -a "$TRACE_LOG"

# Test 3: Ghost-compatible payload
echo "[TEST 3] Ghost-compatible payload..." | tee -a "$TRACE_LOG"
***REMOVED***_PAYLOAD='{
  "id": "tunnel-trace-test",
  "role": "command_patch",
  "target_file": "'"$TRACE_LOG"'",
  "patch": "echo \"[✅ TUNNEL TRACE RECEIVED] $(date)\" >> '"$TRACE_LOG"'"
}'
{ timeout 30 curl -s -X POST -H 'Content-Type: application/json' \
  -d "$***REMOVED***_PAYLOAD" \
  https://webhook-thoughtmarks.thoughtmarks.app/webhook & } >/dev/null 2>&1 & disown
sleep 5
curl -s -X POST -H 'Content-Type: application/json' \
  -d "$***REMOVED***_PAYLOAD" \
  https://webhook-thoughtmarks.thoughtmarks.app/webhook | tee -a "$TRACE_LOG"
echo "" | tee -a "$TRACE_LOG"

# Test 4: Local Flask endpoint test
echo "[TEST 4] Local Flask endpoint test..." | tee -a "$TRACE_LOG"
LOCAL_PAYLOAD='{"id":"local-test","role":"command_patch","target_file":"'"$TRACE_LOG"'","patch":"echo \"[✅ LOCAL FLASK RECEIVED] $(date)\" >> '"$TRACE_LOG"'"}'
{ timeout 30 curl -s -X POST -H 'Content-Type: application/json' \
  -d "$LOCAL_PAYLOAD" \
  http://localhost:5555/webhook & } >/dev/null 2>&1 & disown
sleep 5
curl -s -X POST -H 'Content-Type: application/json' \
  -d "$LOCAL_PAYLOAD" \
  http://localhost:5555/webhook | tee -a "$TRACE_LOG"
echo "" | tee -a "$TRACE_LOG"

# Test 5: Check if trace markers were written
echo "[TEST 5] Checking trace markers..." | tee -a "$TRACE_LOG"
if grep -q "TUNNEL TRACE RECEIVED" "$TRACE_LOG"; then
  echo "✅ TUNNEL TRACE RECEIVED found - payload routing working" | tee -a "$TRACE_LOG"
else
  echo "❌ TUNNEL TRACE RECEIVED NOT FOUND - payload routing failed" | tee -a "$TRACE_LOG"
fi

if grep -q "LOCAL FLASK RECEIVED" "$TRACE_LOG"; then
  echo "✅ LOCAL FLASK RECEIVED found - Flask app working" | tee -a "$TRACE_LOG"
else
  echo "❌ LOCAL FLASK RECEIVED NOT FOUND - Flask app issue" | tee -a "$TRACE_LOG"
fi

echo "" | tee -a "$TRACE_LOG"
echo "=== DIAGNOSTIC COMPLETE ===" | tee -a "$TRACE_LOG"
echo "Full trace log: $TRACE_LOG" | tee -a "$TRACE_LOG" 

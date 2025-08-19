#!/bin/bash

# Stress Lifecycle Test Script
# Tests daemon lifecycle with multiple iterations

set -e

echo "🔁 Starting daemon lifecycle stress test..."

# Create logs directory if it doesn't exist
mkdir -p logs/ghost

# Initialize test counter
SUCCESS_COUNT=0
FAILURE_COUNT=0

for i in {1..5}; do
  echo "🔁 Stress iteration $i"
  
  # Start patch executor loop in background
  echo "[ITERATION $i] Starting patch executor loop..."
  node scripts/patch-executor-loop.js > logs/ghost/stress-iteration-$i.log 2>&1 &
  EXECUTOR_PID=$!
  
  # Wait for executor to start
  sleep 2
  
  # Check if executor is running
  if ps -p $EXECUTOR_PID > /dev/null; then
    echo "[ITERATION $i] ✅ Patch executor started (PID: $EXECUTOR_PID)"
    
    # Let it run for a bit
    sleep 3
    
    # Kill the executor
    echo "[ITERATION $i] Stopping patch executor..."
    pkill -f patch-executor-loop || true
    
    # Wait for cleanup
    sleep 1
    
    # Check if it was killed successfully
    if ! ps -p $EXECUTOR_PID > /dev/null 2>&1; then
      echo "[ITERATION $i] ✅ Patch executor stopped successfully"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
      echo "[ITERATION $i] ❌ Patch executor failed to stop"
      FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
  else
    echo "[ITERATION $i] ❌ Patch executor failed to start"
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
  fi
  
  # Clean up any remaining processes
  pkill -f patch-executor-loop 2>/dev/null || true
  
  echo "[ITERATION $i] Completed"
  echo "---"
done

echo "✅ Stress test complete"
echo "📊 Results:"
echo "  - Successful iterations: $SUCCESS_COUNT"
echo "  - Failed iterations: $FAILURE_COUNT"
echo "  - Success rate: $((SUCCESS_COUNT * 100 / 5))%"

# Log results
echo "[STRESS-TEST] $(date -u +%Y-%m-%dT%H:%M:%SZ) - Completed 5 iterations: $SUCCESS_COUNT success, $FAILURE_COUNT failed" >> logs/ghost/monitor-sync.log

# Exit with success if at least 3 iterations succeeded
if [ $SUCCESS_COUNT -ge 3 ]; then
  echo "🎉 Stress test passed (${SUCCESS_COUNT}/5 iterations successful)"
  exit 0
else
  echo "❌ Stress test failed (only ${SUCCESS_COUNT}/5 iterations successful)"
  exit 1
fi 

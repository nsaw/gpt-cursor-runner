#!/bin/bash

# Kill any existing Expo processes
kill $(lsof -ti:8081) 2>/dev/null || true

# Start Expo in the background
cd "$(dirname "$0")/.." && npx expo start --ios --clear &
EXPO_PID=$!

# Wait for Expo to start
echo "Waiting for Expo to start..."
sleep 30

# Run Maestro tests
echo "Running Maestro tests..."
cd maestro && maestro test -c config.yaml flows/app-launch.yaml

# Capture test results
TEST_STATUS=$?

# Kill Expo process
kill $EXPO_PID 2>/dev/null || true

# Exit with test status
exit $TEST_STATUS

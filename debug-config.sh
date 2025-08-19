#!/bin/bash

echo "🔍 Debugging backend-api configuration..."

# Get the service configuration
config=$(grep "backend-api" scripts/core/unified-manager.sh | head -1 | sed 's/.*echo "\([^"]*\)".*/\1/')

echo "Raw config: $config"

# Parse the configuration
IFS=':' read -r service_type service_id command port health_url watchdog_script working_dir <<< "$config"

echo "Parsed configuration:"
echo "  service_type: $service_type"
echo "  service_id: $service_id"
echo "  command: $command"
echo "  port: $port"
echo "  health_url: $health_url"
echo "  watchdog_script: $watchdog_script"
echo "  working_dir: $working_dir"

echo ""
echo "Testing port detection..."
if [ -n "$port" ]; then
    echo "Port is: $port"
    if lsof -i ":$port" > /dev/null 2>&1; then
        echo "✅ Port $port is in use"
        lsof -i ":$port"
    else
        echo "❌ Port $port is not in use"
    fi
else
    echo "❌ No port configured"
fi

echo ""
echo "Testing health URL..."
if [ -n "$health_url" ]; then
    echo "Health URL is: $health_url"
    if curl -s --max-time 5 "$health_url" > /dev/null 2>&1; then
        echo "✅ Health URL is responding"
    else
        echo "❌ Health URL is not responding"
    fi
else
    echo "❌ No health URL configured"
fi 

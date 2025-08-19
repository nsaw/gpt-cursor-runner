#!/bin/bash

# Test the health_check function logic for backend-api
echo "🔍 Testing health_check function for backend-api..."

# Simulate the health_check function
service_name="backend-api"
health_url="http://localhost:4000/health"
timeout=5

echo "1. Testing curl with status field check..."
if curl -s --max-time $timeout "$health_url" | grep -q '"status"'; then
    echo "✅ Health check passed - status field found"
    exit 0
else
    echo "❌ Health check failed - no status field found"
    echo "Response:"
    curl -s --max-time $timeout "$health_url"
    exit 1
fi 

#!/bin/bash

# GHOST RUNNER Dashboard Startup Script

echo "🚀 Starting GHOST RUNNER Dashboard..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check if Flask is installed
if ! python3 -c "import flask" &> /dev/null; then
    echo "📦 Installing Flask dependencies..."
    pip3 install -r requirements.txt
fi

# Create logs directory if it doesn't exist
mkdir -p /Users/sawyer/gitSync/gpt-cursor-runner/logs

# Start the dashboard
echo "📊 Starting Flask dashboard..."
echo "🌐 Dashboard will be available at: http://localhost:5000"
echo "🔗 API endpoints:"
echo "   - /api/status - Dashboard data"
echo "   - /api/health - Health check"
echo ""
echo "Press Ctrl+C to stop the dashboard"
echo ""

python3 app.py 

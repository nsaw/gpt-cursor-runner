#!/bin/bash
# kill-ports-main.sh
# Kills all ports and processes for the MAIN project (gpt-cursor-runner)

echo "🔄 Killing ports for MAIN project..."

# Kill Python ghost runner processes
echo "📡 Killing Python ghost runner..."
pkill -f "python3 -m gpt_cursor_runner.main" 2>/dev/null || true
pkill -f "gpt_cursor_runner.main" 2>/dev/null || true
pkill -f "gpt_cursor_runner" 2>/dev/null || true

# Kill Node.js server processes
echo "🖥️ Killing Node.js server..."
pkill -f "node server/index.js" 2>/dev/null || true
pkill -f "server/index.js" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

# Kill specific ports
echo "🔌 Killing specific ports..."
lsof -ti:5051 | xargs kill -9 2>/dev/null || true
lsof -ti:5555 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Verify ports are free
echo "🔍 Verifying ports are free..."
if lsof -i:5051 >/dev/null 2>&1; then
    echo "⚠️  Port 5051 still in use"
else
    echo "✅ Port 5051 is free"
fi

if lsof -i:5555 >/dev/null 2>&1; then
    echo "⚠️  Port 5555 still in use"
else
    echo "✅ Port 5555 is free"
fi

echo "✅ MAIN project ports killed" 

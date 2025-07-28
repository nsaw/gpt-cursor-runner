#!/bin/bash
# kill-all-ports.sh
# Kills all ports and processes for both MAIN and CYOPS projects

echo "🔄 Killing all project ports..."

# Kill all project-related processes
echo "📡 Killing Python processes..."
pkill -f "gpt_cursor_runner" 2>/dev/null || true
pkill -f "python3 -m gpt_cursor_runner" 2>/dev/null || true

echo "🖥️ Killing Node.js processes..."
pkill -f "node server/index.js" 2>/dev/null || true
pkill -f "server/index.js" 2>/dev/null || true

echo "📱 Killing Expo processes..."
pkill -f "expo" 2>/dev/null || true
pkill -f "npx expo" 2>/dev/null || true

echo "🚇 Killing Metro processes..."
pkill -f "metro" 2>/dev/null || true

echo "🔧 Killing backend processes..."
pkill -f "nodemon" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true

# Kill specific ports
echo "🔌 Killing specific ports..."
lsof -ti:4000,4040,4041,5051,5555,8082,19006 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 3

# Verify ports are free
echo "🔍 Verifying ports are free..."
PORTS=(4000 4040 4041 5051 5555 8082 19006)
for port in "${PORTS[@]}"; do
    if lsof -i:$port >/dev/null 2>&1; then
        echo "⚠️  Port $port still in use"
    else
        echo "✅ Port $port is free"
    fi
done

echo "✅ All project ports killed" 
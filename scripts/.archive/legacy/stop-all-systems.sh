#!/bin/bash

echo "🛑 Stopping ALL Systems for MAIN and CYOPS..."
echo "=============================================="

# Function to stop a service
stop_service() {
    local service_name=$1
    local pattern=$2
    
    echo "🛑 Stopping $service_name..."
    pkill -f "$pattern" 2>/dev/null || true
    echo "   ✅ $service_name stopped"
}

# Stop MAIN System Services
echo ""
echo "🔵 MAIN System Services:"
echo "-----------------------"

stop_service "MAIN patch-executor" "scripts/patch-executor.js"
stop_service "MAIN ghost-bridge" "scripts/ghost-bridge.js"
stop_service "MAIN summary-monitor" "scripts/summary-monitor.js"
stop_service "MAIN realtime-monitor" "scripts/realtime-monitor.js"

# Stop CYOPS System Services
echo ""
echo "🟡 CYOPS System Services:"
echo "------------------------"

stop_service "CYOPS patch-executor" "scripts/patch-executor.js"
stop_service "CYOPS ghost-bridge" "scripts/ghost-bridge.js"
stop_service "CYOPS summary-monitor" "scripts/summary-monitor.js"
stop_service "CYOPS realtime-monitor" "scripts/realtime-monitor.js"
stop_service "CYOPS doc-sync" "scripts/doc-sync.js"
stop_service "CYOPS orchestrator" "scripts/system/orchestrator.js"
stop_service "CYOPS daemon-manager" "scripts/daemon-manager.js"

# Stop Tunnel Services
echo ""
echo "🌐 Tunnel Services:"
echo "------------------"

stop_service "Cloudflare tunnel" "cloudflared"
stop_service "ngrok tunnel" "ngrok http"
stop_service "ngrok ghost-runner" "ngrok http 5051"
stop_service "ngrok webhook" "ngrok http 5555"

# Stop Watchdog Daemons
echo ""
echo "🛡️  Watchdog Daemons:"
echo "-------------------"

stop_service "tunnel watchdog" "tunnel-watchdog.sh"
stop_service "system health watchdog" "system-health-watchdog.js"
stop_service "service watchdog" "service-watchdog.js"
stop_service "patch watchdog" "patch-watchdog.js"

# Stop Deployment Services
echo ""
echo "🚀 Deployment Services:"
echo "---------------------"

stop_service "Fly.io deployment" "flyctl deploy"
stop_service "Fly.io monitoring" "flyctl status"

# Stop PM2 Services
echo ""
echo "🟢 PM2 Services:"
echo "---------------"

echo "🛑 Stopping PM2 ecosystem..."
{ pm2 stop all & } >/dev/null 2>&1 & disown
{ pm2 delete all & } >/dev/null 2>&1 & disown
echo "   ✅ PM2 ecosystem stopped"

# Stop any remaining processes
echo ""
echo "🧹 Cleanup:"
echo "-----------"

echo "🛑 Stopping any remaining Node.js processes..."
pkill -f "node.*scripts" 2>/dev/null || true
echo "   ✅ Node.js processes cleaned up"

echo "🛑 Stopping any remaining cloudflared processes..."
pkill -f "cloudflared" 2>/dev/null || true
echo "   ✅ Cloudflared processes cleaned up"

echo "🛑 Stopping any remaining ngrok processes..."
pkill -f "ngrok" 2>/dev/null || true
echo "   ✅ ngrok processes cleaned up"

echo "🛑 Stopping any remaining flyctl processes..."
pkill -f "flyctl" 2>/dev/null || true
echo "   ✅ flyctl processes cleaned up"

echo "🛑 Stopping any remaining watchdog processes..."
pkill -f "watchdog" 2>/dev/null || true
echo "   ✅ watchdog processes cleaned up"

# Wait a moment
sleep 3

# Final status check
echo ""
echo "📊 Final Status Check:"
echo "--------------------"

# Check if any processes are still running
if pgrep -f "scripts/patch-executor.js\|scripts/ghost-bridge.js\|scripts/summary-monitor.js\|scripts/realtime-monitor.js\|cloudflared\|ngrok\|flyctl\|watchdog" > /dev/null; then
    echo "   ⚠️  Some processes may still be running"
    pgrep -f "scripts/patch-executor.js\|scripts/ghost-bridge.js\|scripts/summary-monitor.js\|scripts/realtime-monitor.js\|cloudflared\|ngrok\|flyctl\|watchdog" | xargs ps -p 2>/dev/null || true
else
    echo "   ✅ All services stopped successfully"
fi

echo ""
echo "✅ All systems stopped!"
echo "💡 To restart all services: ./scripts/launch-all-systems.sh" 

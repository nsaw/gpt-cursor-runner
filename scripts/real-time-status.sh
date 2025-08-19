#!/bin/bash
echo "=== REAL-TIME ***REMOVED*** SYSTEM STATUS ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

echo "🔌 PORT STATUS:"
echo "5051 (Main Runner): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5051/health 2>/dev/null || echo 'DOWN')"
echo "8788 (Telemetry API): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8788/health 2>/dev/null || echo 'DOWN')"
echo "5001 (Flask Dashboard): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5001/api/health 2>/dev/null || echo 'DOWN')"
echo ""

echo "🌐 TUNNEL STATUS:"
echo "gpt-cursor-runner.thoughtmarks.app: $(curl -s -o /dev/null -w '%{http_code}' https://gpt-cursor-runner.thoughtmarks.app/monitor 2>/dev/null || echo 'DOWN')"
echo "ghost.thoughtmarks.app: $(curl -s -o /dev/null -w '%{http_code}' https://ghost.thoughtmarks.app/status 2>/dev/null || echo 'DOWN')"
echo ""

echo "🔄 PROCESS STATUS:"
ps aux | grep -E "(ghost|patch|summary|telemetry)" | grep -v grep | wc -l | tr -d ' ' | xargs echo "Active Ghost Processes:"
echo ""

echo "📊 HEARTBEAT STATUS:"
if [ -f "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json" ]; then
    echo "✅ Heartbeat file exists"
    echo "Last updated: $(jq -r '.last_updated' /Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json 2>/dev/null || echo 'Unknown')"
else
    echo "❌ Heartbeat file missing"
fi
echo ""

echo "🎯 OVERALL STATUS:"
if curl -s http://localhost:5051/health >/dev/null 2>&1 && \
   curl -s http://localhost:8788/health >/dev/null 2>&1 && \
   curl -s http://localhost:5001/api/health >/dev/null 2>&1; then
    echo "✅ ALL SYSTEMS OPERATIONAL"
else
    echo "⚠️  SOME SYSTEMS DOWN"
fi

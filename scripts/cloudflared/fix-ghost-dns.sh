#!/bin/bash
# Fix DNS record for ghost.thoughtmarks.app to point to the correct tunnel connector

set -e

TUNNEL_ID="c9a7bf54-dab4-4c9f-a05d-2022f081f4e0"
CONNECTOR_ID="a68ead22-d75c-447b-ac85-ea317e578ead"
HOSTNAME="ghost.thoughtmarks.app"

echo "🔧 Fixing DNS record for $HOSTNAME..."

# First, let's check what DNS records exist
echo "📋 Checking existing DNS records..."
cloudflared tunnel route ip show

# Add the correct route with overwrite flag
echo "➕ Adding correct route for $HOSTNAME (overwriting existing)..."
cloudflared tunnel route dns --overwrite-dns $TUNNEL_ID $HOSTNAME

echo "✅ DNS record updated for $HOSTNAME"
echo "🔗 Tunnel connector: $CONNECTOR_ID"
echo "🌐 Public URL: https://$HOSTNAME"

# Wait for DNS propagation
echo "⏳ Waiting for DNS propagation..."
sleep 30

# Test the endpoint
echo "🧪 Testing public endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$HOSTNAME/api/health || echo "error")

if [ "$STATUS" = "200" ]; then
    echo "✅ SUCCESS! Dashboard is accessible at: https://$HOSTNAME/monitor"
    echo "🔗 Health endpoint: https://$HOSTNAME/api/health"
else
    echo "⚠️  Endpoint returned status: $STATUS"
    echo "📋 Check tunnel logs for more details"
fi 

#!/bin/bash

# Fix Watchdog Plist Files
# Removes StartInterval from plist files to allow proper daemon operation

set -e

PLIST_DIR="$HOME/Library/LaunchAgents"
PROJECT_DIR="/Users/sawyer/gitSync/gpt-cursor-runner"

echo "🔧 Fixing watchdog plist files..."

# Function to fix a plist file
fix_plist() {
    local service="$1"
    local plist_name="com.thoughtmarks.watchdog.$service"
    local plist_path="$PLIST_DIR/$plist_name.plist"
    
    if [ -f "$plist_path" ]; then
        echo "📝 Fixing $plist_name.plist..."
        
        # Create backup
        cp "$plist_path" "$plist_path.backup"
        
        # Generate correct plist content for each service
        cat > "$plist_path" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$plist_name</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$PROJECT_DIR/scripts/watchdog-$service.sh</string>
        <string>start</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/logs/watchdogs/$service-watchdog-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/logs/watchdogs/$service-watchdog-stderr.log</string>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>WATCHDOG_MODE</key>
        <string>launchd</string>
        <key>WATCHDOG_INSTALLATION_UUID</key>
        <string>4C4B566F-31D8-4B99-92BB-FC5BCC78661F</string>
    </dict>
</dict>
</plist>
EOF
        
        echo "✅ Fixed $plist_name.plist"
    else
        echo "❌ Plist file not found: $plist_path"
    fi
}

# Fix each watchdog plist
fix_plist "fly"
fix_plist "tunnel" 
fix_plist "runner"

echo "🔄 Reloading launchd services..."

# Unload and reload each service
for service in fly tunnel runner; do
    echo "🔄 Reloading com.thoughtmarks.watchdog.$service..."
    launchctl unload "$PLIST_DIR/com.thoughtmarks.watchdog.$service.plist" 2>/dev/null || true
    sleep 1
    launchctl load "$PLIST_DIR/com.thoughtmarks.watchdog.$service.plist"
done

echo "✅ Plist files fixed and services reloaded"
echo "📊 Checking service status:"
launchctl list | grep thoughtmarks 
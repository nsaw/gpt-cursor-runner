#!/bin/bash

# Setup Local Daemon Script
# Creates and loads launchd plist for localhost:5051 monitoring

cd /Users/sawyer/gitSync/gpt-cursor-runner

# Create the plist file
cat > ~/Library/LaunchAgents/com.thoughtmarks.local-daemon.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.thoughtmarks.local-daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/sawyer/gitSync/gpt-cursor-runner/scripts/start-local-daemon.sh</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/sawyer/gitSync/gpt-cursor-runner/logs/local-daemon.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/sawyer/gitSync/gpt-cursor-runner/logs/local-daemon-error.log</string>
    <key>WorkingDirectory</key>
    <string>/Users/sawyer/gitSync/gpt-cursor-runner</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
EOF

# Set permissions
chmod 644 ~/Library/LaunchAgents/com.thoughtmarks.local-daemon.plist

# Unload existing service if it exists
launchctl unload ~/Library/LaunchAgents/com.thoughtmarks.local-daemon.plist 2>/dev/null || true

# Load the new service
launchctl load ~/Library/LaunchAgents/com.thoughtmarks.local-daemon.plist

echo "✅ Local daemon setup complete"
echo "📁 Plist: ~/Library/LaunchAgents/com.thoughtmarks.local-daemon.plist"
echo "📊 Logs: logs/local-daemon.log"
echo "🔄 Service: Monitors localhost:5051 continuously"
echo "🎯 Target: http://localhost:5051/health" 
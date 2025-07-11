#!/bin/bash

# Setup Patch Daemon Script
# Creates and loads launchd plist for patch monitoring

cd /Users/sawyer/gitSync/gpt-cursor-runner

# Create the plist file
cat > ~/Library/LaunchAgents/com.thoughtmarks.patch-daemon.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.thoughtmarks.patch-daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/sawyer/gitSync/gpt-cursor-runner/scripts/auto-apply-cursor-patches.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-daemon.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-daemon-error.log</string>
    <key>WorkingDirectory</key>
    <string>/Users/sawyer/gitSync/gpt-cursor-runner</string>
</dict>
</plist>
EOF

# Set permissions
chmod 644 ~/Library/LaunchAgents/com.thoughtmarks.patch-daemon.plist

# Unload existing service if it exists
launchctl unload ~/Library/LaunchAgents/com.thoughtmarks.patch-daemon.plist 2>/dev/null || true

# Load the new service
launchctl load ~/Library/LaunchAgents/com.thoughtmarks.patch-daemon.plist

echo "✅ Patch daemon setup complete"
echo "📁 Plist: ~/Library/LaunchAgents/com.thoughtmarks.patch-daemon.plist"
echo "📊 Logs: logs/patch-daemon.log"
echo "🔄 Service: Runs every 60 seconds" 
#!/bin/bash

# Fix incorrect URLs in all template files
echo "Fixing incorrect URLs in template files..."

# Create backups
cp /Users/sawyer/gitSync/gpt-cursor-runner/env.example /Users/sawyer/gitSync/gpt-cursor-runner/env.example.backup.$(date +%Y%m%d_%H%M%S)
cp /Users/sawyer/gitSync/gpt-cursor-runner/template.env /Users/sawyer/gitSync/gpt-cursor-runner/template.env.backup.$(date +%Y%m%d_%H%M%S)

# Fix env.example
echo "Fixing env.example..."
sed -i '' 's|RUNNER_URL=https://runner.thoughtmarks.app|RUNNER_URL=https://gpt-cursor-runner.thoughtmarks.app|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|RUNNER_DEV_URL=https://runner.thoughtmarks.app|RUNNER_DEV_URL=https://gpt-cursor-runner.thoughtmarks.app|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|ENDPOINT_URL=https://webhook.thoughtmarks.app|ENDPOINT_URL=https://slack.thoughtmarks.app/slack/commands|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|ENDPOINT_DEV_URL=https://runner.thoughtmarks.app/webhook|ENDPOINT_DEV_URL=https://slack.thoughtmarks.app/slack/commands|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|DASHBOARD_URL=https://runner.thoughtmarks.app/dashboard|DASHBOARD_URL=https://gpt-cursor-runner.thoughtmarks.app/api/status|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|DASHBOARD_DEV_URL=https://runner.thoughtmarks.app/dashboard|DASHBOARD_DEV_URL=https://gpt-cursor-runner.thoughtmarks.app/api/status|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|SLACK_REDIRECT_URI=https://runner.thoughtmarks.app/slack/oauth/callback|SLACK_REDIRECT_URI=https://slack.thoughtmarks.app/slack/oauth/callback|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example
sed -i '' 's|WEBHOOK_URL=https://webhook.thoughtmarks.app|WEBHOOK_URL=https://slack.thoughtmarks.app/slack/commands|g' /Users/sawyer/gitSync/gpt-cursor-runner/env.example

# Add the missing environment variables to env.example
echo "" >> /Users/sawyer/gitSync/gpt-cursor-runner/env.example
echo "# Environment-specific endpoint URLs" >> /Users/sawyer/gitSync/gpt-cursor-runner/env.example
echo "CURSOR_ENDPOINT_PROD=https://gpt-cursor-runner.thoughtmarks.app/api/status" >> /Users/sawyer/gitSync/gpt-cursor-runner/env.example
echo "CURSOR_ENDPOINT_DEV=https://gpt-cursor-runner.thoughtmarks.app/api/status" >> /Users/sawyer/gitSync/gpt-cursor-runner/env.example
echo "PUBLIC_RUNNER_URL=https://gpt-cursor-runner.thoughtmarks.app" >> /Users/sawyer/gitSync/gpt-cursor-runner/env.example
echo "SERVICE_SLACK=https://slack.thoughtmarks.app/slack/commands" >> /Users/sawyer/gitSync/gpt-cursor-runner/env.example

# Fix template.env comments
echo "Fixing template.env comments..."
sed -i '' 's|# RUNNER.THOUGHTMARKS.APP|# SLACK.THOUGHTMARKS.APP|g' /Users/sawyer/gitSync/gpt-cursor-runner/template.env

echo "✅ Template files fixed!"
echo "Changes made to env.example:"
echo "  - RUNNER_URL: runner.thoughtmarks.app → gpt-cursor-runner.thoughtmarks.app"
echo "  - ENDPOINT_URL: webhook.thoughtmarks.app → slack.thoughtmarks.app/slack/commands"
echo "  - DASHBOARD_URL: runner.thoughtmarks.app/dashboard → gpt-cursor-runner.thoughtmarks.app/api/status"
echo "  - SLACK_REDIRECT_URI: runner.thoughtmarks.app → slack.thoughtmarks.app"
echo "  - Added missing CURSOR_ENDPOINT_PROD, CURSOR_ENDPOINT_DEV, PUBLIC_RUNNER_URL, SERVICE_SLACK"
echo ""
echo "⚠️  WARNING: These template files are used by setup scripts!"
echo "   Anyone running setup scripts will now get the correct URLs."

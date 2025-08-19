#!/bin/bash

# Fix incorrect URLs in .env.development file
echo "Fixing incorrect URLs in .env.development file..."

# Create backup
cp /Users/sawyer/gitSync/gpt-cursor-runner/.env.development /Users/sawyer/gitSync/gpt-cursor-runner/.env.development.backup.$(date +%Y%m%d_%H%M%S)

# Update the incorrect URLs with correct values
sed -i '' 's|RUNNER_URL=https://slack.thoughtmarks.app|RUNNER_URL=https://gpt-cursor-runner.thoughtmarks.app|g' /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
sed -i '' 's|RUNNER_DEV_URL=https://slack.thoughtmarks.app|RUNNER_DEV_URL=https://gpt-cursor-runner.thoughtmarks.app|g' /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
sed -i '' 's|ENDPOINT_URL=https://slack.thoughtmarks.app/webhook|ENDPOINT_URL=https://slack.thoughtmarks.app/slack/commands|g' /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
sed -i '' 's|ENDPOINT_DEV_URL=https://slack.thoughtmarks.app/webhook|ENDPOINT_DEV_URL=https://slack.thoughtmarks.app/slack/commands|g' /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
sed -i '' 's|DASHBOARD_URL=https://gpt-cursor-runner.fly.dev/monitor|DASHBOARD_URL=https://gpt-cursor-runner.thoughtmarks.app/api/status|g' /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
sed -i '' 's|DASHBOARD_DEV_URL=https://gpt-cursor-runner.fly.dev/monitor|DASHBOARD_DEV_URL=https://gpt-cursor-runner.thoughtmarks.app/api/status|g' /Users/sawyer/gitSync/gpt-cursor-runner/.env.development

# Add the missing environment variables
echo "" >> /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
echo "# Environment-specific endpoint URLs" >> /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
echo "CURSOR_ENDPOINT_PROD=https://gpt-cursor-runner.thoughtmarks.app/api/status" >> /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
echo "CURSOR_ENDPOINT_DEV=https://gpt-cursor-runner.thoughtmarks.app/api/status" >> /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
echo "PUBLIC_RUNNER_URL=https://gpt-cursor-runner.thoughtmarks.app" >> /Users/sawyer/gitSync/gpt-cursor-runner/.env.development
echo "SERVICE_SLACK=https://slack.thoughtmarks.app/slack/commands" >> /Users/sawyer/gitSync/gpt-cursor-runner/.env.development

echo "✅ Development environment URLs fixed!"
echo "Changes made:"
echo "  - RUNNER_URL: slack.thoughtmarks.app → gpt-cursor-runner.thoughtmarks.app"
echo "  - RUNNER_DEV_URL: slack.thoughtmarks.app → gpt-cursor-runner.thoughtmarks.app"
echo "  - ENDPOINT_URL: /webhook → /slack/commands"
echo "  - ENDPOINT_DEV_URL: /webhook → /slack/commands"
echo "  - DASHBOARD_URL: fly.dev/monitor → thoughtmarks.app/api/status"
echo "  - DASHBOARD_DEV_URL: fly.dev/monitor → thoughtmarks.app/api/status"
echo "  - Added missing CURSOR_ENDPOINT_PROD, CURSOR_ENDPOINT_DEV, PUBLIC_RUNNER_URL, SERVICE_SLACK"

#!/bin/bash

# Manual Slack Commands Setup Helper
echo "🚀 Slack Commands Manual Setup Helper"
echo "====================================="
echo ""
echo "This will help you set up all 27 slash commands in the Slack API dashboard."
echo ""

# Check if we have the template file
if [ ! -f "tasks/12_slack_commands_copy_paste_template.txt" ]; then
    echo "❌ Template file not found. Please run the setup script first."
    exit 1
fi

echo "📋 Setup Instructions:"
echo "1. Open your browser and go to: https://api.slack.com/apps"
echo "2. Select your GPT-Cursor Runner app"
echo "3. Click 'Slash Commands' in the left sidebar"
echo "4. For each command below, click 'Create New Command'"
echo "5. Copy-paste the values provided"
echo ""

echo "🔗 Your webhook URL is: https://gpt-cursor-runner.fly.dev/slack/commands"
echo ""

echo "📝 Commands to add (27 total):"
echo "================================"

# Read and display commands from template
while IFS= read -r line; do
    if [[ $line =~ ^Command:\ / ]]; then
        echo "✅ $line"
    elif [[ $line =~ ^Request\ URL: ]]; then
        echo "   $line"
    elif [[ $line =~ ^Short\ Description: ]]; then
        echo "   $line"
    elif [[ $line =~ ^Usage\ Hint: ]]; then
        echo "   $line"
        echo ""
    fi
done < "tasks/12_slack_commands_copy_paste_template.txt"

echo ""
echo "🎯 Quick Test Commands (try these first):"
echo "- /status"
echo "- /dashboard"
echo "- /whoami"
echo "- /roadmap"
echo ""

echo "📄 Full template available at: tasks/12_slack_commands_copy_paste_template.txt"
echo "📖 Detailed guide available at: tasks/11_slack_api_dashboard_setup_guide.md"
echo ""

echo "✅ Setup complete! Your commands should now be available in Slack."
echo ""
echo "🔧 Troubleshooting:"
echo "- Commands not appearing? Make sure app is installed to workspace"
echo "- 404 errors? Check the webhook URL is correct"
echo "- Permission errors? Verify app permissions in Slack settings" 
#!/bin/bash

# Post Updated Cheatsheet to Slack
set -e

echo "📎 Posting Updated Cheatsheet to Slack"
echo "======================================"

# Read the cheatsheet content
CHEATSHEET_CONTENT=$(cat SLACK_COMMAND_CHEATSHEET.md)

# Create the JSON payload for Slack dispatch
PAYLOAD=$(cat << EOF
{
  "action": "postMessage",
  "channel": "#runner-control",
  "text": "📎 *Updated GPT-Cursor Runner Cheatsheet*\n\nHere's the corrected and updated command reference:",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "📎 Updated GPT-Cursor Runner Cheatsheet"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "Here's the corrected and updated command reference with all implemented commands:"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*STATUS + INFO*\n• \`/status-runner\` → Full system status + memory + patch stats ✅\n• \`/dashboard\` → Open patch dashboard ✅\n• \`/whoami\` → Your identity + access level ✅"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*RUNNER CONTROLS*\n• \`/toggle-runner-auto\` → Toggle auto/manual mode ✅\n• \`/pause-runner\` → Pause the runner ✅\n• \`/proceed\` → Continue/approve next action (consolidated) ✅\n• \`/again\` → Retry failed or restart runner (consolidated) ✅"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*PATCH WORKFLOW*\n• \`/patch-approve\` → Approve current patch ✅\n• \`/patch-revert\` → Revert latest patch ✅\n• \`/patch-preview\` → View pending patch before applying ✅\n• \`/revert-phase\` → Undo last full phase ✅"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*MANUAL INTERVENTION*\n• \`/manual-revise\` → Send patch back to Cursor for revision ✅\n• \`/manual-append\` → Append your input + forward ✅\n• \`/interrupt\` → Pause and redirect flow manually ✅\n• \`/send-with\` → Request logs/screenshot/context ✅"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*TROUBLESHOOTING*\n• \`/troubleshoot\` → GPT auto-generates and applies diagnostic patch ✅\n• \`/troubleshoot-oversight\` → Auto-runs patch, pauses for human approval ✅"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*SLACK DISPATCH (NEW)*\n• \`/gpt-slack-dispatch\` → GPT posts directly to Slack ✅\n• \`/cursor-slack-dispatch\` → Cursor posts code blocks to Slack ✅"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*EMERGENCY OPS*\n• \`/kill\` → Emergency kill (hard stop) ✅\n• \`/alert-runner-crash\` → Report silent or unlogged crash ✅"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*CORRECTIONS FROM YOUR ORIGINAL:*\n❌ \`/patch-pass\` → Use \`/patch-approve\` instead\n❌ \`/restart-runner\` → Use \`/again restart\` instead\n❌ \`/read-secret [KEY]\` → Not implemented yet"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "📄 Full cheatsheet: \`SLACK_COMMAND_CHEATSHEET.md\` | 🔗 Dashboard: \`/dashboard\`"
        }
      ]
    }
  ]
}
EOF
)

echo "📤 Posting to #runner-control..."
echo "Payload: $PAYLOAD"

# Use curl to post to the runner's Slack dispatch endpoint
curl -X POST https://gpt-cursor-runner.fly.dev/slack/commands \
  -H "Content-Type: application/json" \
  -d "{
    \"command\": \"/gpt-slack-dispatch\",
    \"text\": $(echo "$PAYLOAD" | jq -c .),
    \"user_name\": \"cheatsheet-updater\"
  }"

echo ""
echo "✅ Cheatsheet posted to Slack!"
echo "📎 You can also pin this message for easy reference" 
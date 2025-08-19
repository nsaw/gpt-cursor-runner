# Slack Dispatch Usage Guide

## Overview

The GPT-Cursor Runner now supports direct Slack dispatch from both GPT and Cursor, allowing AI agents to post messages, code blocks, and updates directly to Slack channels.

## Configuration

### Enable GPT Slack Dispatch

Add to your `.patchrc` file:

```json
{
  "gpt_slack": {
    "allow_gpt_slack_posts": true,
    "gpt_authorized_routes": [
      "/slack/cheatblock",
      "/slack/help",
      "/slack/dashboard-ping"
    ],
    "default_channel": "#runner-control",
    "rate_limit_per_minute": 5,
    "require_approval": false,
    "allowed_actions": ["postMessage", "updateMessage", "deleteMessage"]
  }
}
```

## Usage Examples

### 1. GPT Posting to Slack

#### Basic Message

```python
from gpt_cursor_runner.slack_dispatch import gpt_post

# Post a simple message
result = gpt_post("#runner-control", "🤖 GPT has completed the task!")
print(result)
```

#### Rich Message with Blocks

```python
from gpt_cursor_runner.slack_dispatch import SlackDispatcher

dispatcher = SlackDispatcher()

blocks = [
    {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": "*GPT Update*\nTask completed successfully!"
        }
    },
    {
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "View Details"
                },
                "value": "view_details"
            }
        ]
    }
]

result = dispatcher.gpt_post_message("#runner-control", "GPT Update", blocks)
```

### 2. Cursor Posting Code Blocks

#### Basic Code Block

```python
from gpt_cursor_runner.slack_dispatch import cursor_post_code

# Post a code block
code = """
def hello_world():
    print("Hello from Cursor!")
    return "success"
"""

result = cursor_post_code("#runner-control", code, "New function added")
print(result)
```

#### Using the Dispatcher Class

```python
from gpt_cursor_runner.slack_dispatch import SlackDispatcher

dispatcher = SlackDispatcher()

# Post code with context
result = dispatcher.cursor_post_code_block(
    "#runner-control",
    "const express = require('express');\nconst app = express();",
    "Express.js server setup"
)
```

### 3. Message Management

#### Update Messages

```python
from gpt_cursor_runner.slack_dispatch import SlackDispatcher

dispatcher = SlackDispatcher()

# Update an existing message
result = dispatcher.gpt_update_message(
    "#runner-control",
    "1234567890.123456",  # Message timestamp
    "Updated: Task completed with new results!"
)
```

#### Delete Messages

```python
from gpt_cursor_runner.slack_dispatch import SlackDispatcher

dispatcher = SlackDispatcher()

# Delete a message
result = dispatcher.gpt_delete_message(
    "#runner-control",
    "1234567890.123456"  # Message timestamp
)
```

### 4. Pre-built Templates

#### Post Cheatsheet

```python
from gpt_cursor_runner.slack_dispatch import post_cheatsheet

# Post the runner cheatsheet
result = post_cheatsheet("#runner-control")
```

#### Post Help

```python
from gpt_cursor_runner.slack_dispatch import SlackDispatcher

dispatcher = SlackDispatcher()
result = dispatcher.post_help("#runner-control")
```

#### Post Dashboard Ping

```python
from gpt_cursor_runner.slack_dispatch import SlackDispatcher

dispatcher = SlackDispatcher()
result = dispatcher.post_dashboard_ping("#runner-control")
```

## Direct Slack Commands

### GPT Slack Dispatch

```bash
# Post a message
/gpt-slack-dispatch {"action": "postMessage", "channel": "#runner-control", "text": "🤖 GPT update: Task completed!"}

# Update a message
/gpt-slack-dispatch {"action": "updateMessage", "channel": "#runner-control", "ts": "1234567890.123456", "text": "Updated message"}

# Delete a message
/gpt-slack-dispatch {"action": "deleteMessage", "channel": "#runner-control", "ts": "1234567890.123456"}
```

### Cursor Slack Dispatch

```bash
# Post a message
/cursor-slack-dispatch {"action": "postMessage", "channel": "#runner-control", "text": "📝 Cursor update: Code changes applied"}

# Post a code block
/cursor-slack-dispatch {"action": "postCodeBlock", "channel": "#runner-control", "text": "function hello() { return 'world'; }", "context": "New function added"}

# Update a message
/cursor-slack-dispatch {"action": "updateMessage", "channel": "#runner-control", "ts": "1234567890.123456", "text": "Updated code block"}
```

## Security Features

### Rate Limiting

- GPT posts are rate-limited to 5 per minute by default
- Cursor posts have no rate limit (developer tool)
- Configurable via `.patchrc`

### Authorization

- Only authorized routes can be accessed
- Actions are validated against allowed list
- Channel validation prevents unauthorized posting

### Error Handling

```python
result = gpt_post("#runner-control", "Test message")
if not result['success']:
    print(f"Error: {result['error']}")
else:
    print("Message posted successfully!")
```

## Integration Examples

### GPT Workflow Integration

```python
def gpt_workflow_complete():
    """Called when GPT completes a workflow."""
    from gpt_cursor_runner.slack_dispatch import gpt_post

    result = gpt_post("#runner-control", "✅ GPT workflow completed successfully!")

    if result['success']:
        print("Notification sent to Slack")
    else:
        print(f"Failed to send notification: {result['error']}")
```

### Cursor Code Review Integration

```python
def cursor_code_review(code_changes):
    """Called when Cursor makes code changes."""
    from gpt_cursor_runner.slack_dispatch import cursor_post_code

    for change in code_changes:
        result = cursor_post_code(
            "#runner-control",
            change['code'],
            f"File: {change['file']}, Line: {change['line']}"
        )

        if not result['success']:
            print(f"Failed to post code change: {result['error']}")
```

#***REMOVED***

Required environment variables:

```bash
RUNNER_URL=https://gpt-cursor-runner.fly.dev
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

## Troubleshooting

### Common Issues

1. **"GPT Slack dispatch is disabled"**
   - Check `.patchrc` configuration
   - Ensure `allow_gpt_slack_posts` is `true`

2. **"Action not allowed"**
   - Check the `allowed_actions` list in config
   - Verify the action name matches exactly

3. **"Missing required fields"**
   - Ensure `action` and `channel` are provided
   - For updates/deletes, include `ts` (timestamp)

4. **Rate limit exceeded**
   - Wait for rate limit to reset
   - Adjust `rate_limit_per_minute` in config

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# This will show detailed request/response logs
result = gpt_post("#runner-control", "Debug test")
```

## Best Practices

1. **Use appropriate channels** - Don't spam general channels
2. **Include context** - Always provide meaningful context for code blocks
3. **Handle errors** - Always check the success status of dispatch calls
4. **Rate limiting** - Be mindful of rate limits for GPT posts
5. **Security** - Only post to authorized channels and with appropriate content

## API Reference

### SlackDispatcher Class

- `gpt_post_message(channel, text, blocks=None)`
- `gpt_update_message(channel, ts, text, blocks=None)`
- `gpt_delete_message(channel, ts)`
- `cursor_post_message(channel, text, blocks=None)`
- `cursor_post_code_block(channel, code, context=None)`
- `cursor_update_message(channel, ts, text, blocks=None)`
- `cursor_delete_message(channel, ts)`
- `post_cheatsheet(channel=None)`
- `post_help(channel=None)`
- `post_dashboard_ping(channel=None)`

### Convenience Functions

- `gpt_post(channel, text, blocks=None)`
- `cursor_post_code(channel, code, context=None)`
- `post_cheatsheet(channel=None)`

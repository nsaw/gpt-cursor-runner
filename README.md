# GPT-Cursor Runner

A production-ready CLI tool and webhook microservice for handling GPT-generated code patches with safety guardrails, Slack integration, and automated patch application.

## 🚀 Features

- **Safe Patch Application**: Dry-run by default with dangerous pattern detection
- **Slack Integration**: `/patch` commands and test endpoints
- **Slack Proxy Fallback**: Webhook-based notifications when app install is blocked
- **Webhook Support**: GPT hybrid blocks and Slack events
- **Git Integration**: Automatic commits and backups
- **Schema Validation**: JSON schema for patch format validation
- **CI/CD Ready**: `--force` flag for automation
- **Patch Viewer**: CLI tool for browsing and searching patches
- **GitHub Actions**: Automated CI testing
- **📊 Patch Metrics**: Track time-to-apply, matches found, patch complexity
- **⚙️ Configuration**: `.patchrc` config file for default options
- **🛡️ Rate Limiting**: Prevent Slack spam on malformed inputs
- **🏷️ Role-based Patching**: Auto-labels patches by UI role (button, modal, nav)
- **↩️ Auto-revert Tool**: Revert by `patch_id` or timestamp

## 📦 Installation

```bash
# Clone and install
git clone https://github.com/nsaw/gpt-cursor-runner.git
cd gpt-cursor-runner
pip install -e .

# Verify installation
which gpt-cursor-runner
```

## ⚙️ Configuration

Copy `env.example` to `.env` and configure:

```bash
# Required
GPT_API_KEY=sk-proj-your-key-here
NGROK_PORT=5050
ENDPOINT_URL=https://your-ngrok-subdomain.ngrok-free.app/webhook

# Optional
CURSOR_PROJECT_PATH=/path/to/your/project
SLACK_APP_ID=your-slack-app-id
SLACK_BOT_TOKEN=xapp-your-bot-token

# Slack Proxy (fallback)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#general
SLACK_USERNAME=GPT-Cursor Runner
```

### Configuration File (.patchrc)

Create a `.patchrc` file for default settings:

```json
{
  "defaults": {
    "auto_confirm": false,
    "dry_run": true,
    "backup_files": true,
    "target_directory": ".",
    "preferred_editor": "code"
  },
  "slack": {
    "rate_limit_per_minute": 10,
    "enable_notifications": true,
    "default_channel": "#general"
  },
  "patches": {
    "max_patches_per_day": 100,
    "auto_apply_safe_patches": false,
    "require_author_approval": true,
    "backup_retention_days": 30
  },
  "ui": {
    "show_metrics": true,
    "show_preview": true,
    "color_output": true,
    "verbose_logging": false
  },
  "integrations": {
    "enable_git": true,
    "enable_tests": true,
    "enable_backup": true,
    "enable_metrics": true
  }
}
```

## 🧪 Usage

### Start the Webhook Server

```bash
# Start Flask server
python3 -m gpt_cursor_runner.main

# Or use CLI
gpt-cursor-runner
```

### Apply Patches

```bash
# Preview (dry run, default)
python3 -m gpt_cursor_runner.patch_runner

# Force apply (no prompts, for CI)
python3 -m gpt_cursor_runner.patch_runner --force

# Auto-confirm prompts
python3 -m gpt_cursor_runner.patch_runner --auto
```

### View and Search Patches

```bash
# List all patches
python3 -m gpt_cursor_runner.patch_viewer

# Search patches
python3 -m gpt_cursor_runner.patch_viewer --search "slack"

# View specific patch
python3 -m gpt_cursor_runner.patch_viewer --view patches/my-patch.json

# Show patch content
python3 -m gpt_cursor_runner.patch_viewer --view patches/my-patch.json --show-content
```

### View Events and Metrics

```bash
# View recent events
python3 -m gpt_cursor_runner.event_viewer --limit 20

# Get event summary
python3 -m gpt_cursor_runner.event_viewer --summary

# Search events
python3 -m gpt_cursor_runner.event_viewer --search "slack"

# Filter by event type
python3 -m gpt_cursor_runner.event_viewer --type patch_event
```

### Revert Patches

```bash
# Revert by patch ID
python3 -m gpt_cursor_runner.patch_reverter --patch-id my-patch-id

# Revert latest patch for a file
python3 -m gpt_cursor_runner.patch_reverter --latest --target-file src/Button.tsx

# Revert to specific timestamp
python3 -m gpt_cursor_runner.patch_reverter --timestamp "2025-07-06 15:30:00" --target-file src/Button.tsx

# List revertable patches
python3 -m gpt_cursor_runner.patch_reverter --list
```

### Test Slack Integration

```bash
# Test slash command
python3 scripts/test_slack_command.py

# Test ping endpoint
python3 scripts/test_slack_ping.py
```

## 📋 Patch Format

Patches use JSON format with schema validation:

```json
{
  "id": "patch-name",
  "role": "ui_patch",
  "description": "Fix button alignment",
  "target_file": "src/components/Button.tsx",
  "patch": {
    "pattern": "old text to replace",
    "replacement": "new text"
  },
  "metadata": {
    "author": "gpt",
    "source": "slack_command",
    "timestamp": "auto"
  }
}
```

## 🔗 Slack Integration

### Endpoints

- **Webhook**: `POST /webhook` - Handles `/patch` commands and events
- **Test**: `POST /slack/test` - Creates test patches
- **Events**: `GET /events` - Get recent events for UI

### Setup

1. Configure Slack app with your ngrok URL
2. Add `/patch` slash command
3. Set up event subscriptions

### Fallback Proxy

If app installation is blocked, use the webhook proxy:

```bash
# Configure webhook URL in .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 🏷️ Role-based Patching

The system automatically classifies patches by UI role:

- **Button**: Safe, auto-approve
- **Text**: Safe, auto-approve  
- **Style**: Safe, auto-approve
- **Image/Icon**: Safe, auto-approve
- **Modal**: Medium risk, requires review
- **Form**: Medium risk, requires review
- **Layout**: Medium risk, requires review
- **Navigation**: Dangerous, requires review

## 📊 Metrics and Analytics

Track patch performance with built-in metrics:

- **Time-to-apply**: How long patches take to apply
- **Success rate**: Percentage of successful patches
- **Pattern complexity**: Complexity scoring for patterns
- **File size changes**: Impact on file sizes
- **Role classification**: Automatic role detection

## 🛡️ Safety Features

- **Dry-run by default**: No file changes without explicit confirmation
- **Dangerous pattern detection**: Blocks `.*`, `*`, `.` patterns
- **Backup creation**: Automatic `.bak_*` files
- **Schema validation**: Ensures patch format integrity
- **Git integration**: Automatic commits and version control
- **Rate limiting**: Prevents spam and abuse
- **Role-based approval**: Different rules for different UI components

## 📁 Project Structure

```
gpt-cursor-runner/
├── gpt_cursor_runner/          # Main package
│   ├── main.py                 # Flask server
│   ├── patch_runner.py         # Patch application logic
│   ├── webhook_handler.py      # Webhook processing
│   ├── slack_handler.py        # Slack integration
│   ├── slack_proxy.py          # Slack proxy fallback
│   ├── patch_viewer.py         # Patch viewer CLI
│   ├── event_logger.py         # Event logging system
│   ├── event_viewer.py         # Event viewer CLI
│   ├── patch_metrics.py        # Metrics tracking
│   ├── config_manager.py       # Configuration management
│   ├── rate_limiter.py         # Rate limiting
│   ├── patch_classifier.py     # Role-based classification
│   ├── patch_reverter.py       # Patch reversion tool
│   └── patch_schema.json       # JSON schema
├── patches/                    # Generated patches
├── scripts/                    # Test utilities
├── tests/                      # Test suite
├── .github/workflows/          # CI/CD workflows
├── .env                        # Configuration
├── .patchrc                    # User configuration
├── patch-metrics.json          # Metrics data
└── README.md                   # This file
```

## 🧪 Testing

```bash
# Run test suite
make test

# Or directly
python -m pytest tests/

# Run CI locally
python -m gpt_cursor_runner.patch_runner --force
```

## 🔄 CI/CD

GitHub Actions automatically test patches on every push:

- ✅ Run test suite
- ✅ Test patch runner with sample patches
- ✅ Validate webhook handler
- ✅ Check schema validation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

---

**Status**: ✅ Production-ready with full Slack integration, safety guardrails, CI/CD automation, and advanced features including metrics, role-based patching, and auto-revert capabilities. 

# Manual Fallback

To restart all systems manually:

```bash
cd /Users/sawyer/gitSync/gpt-cursor-runner && ./cursor_runner_selfcheck_v1.sh
```

# Manual Fallback

To restart all systems manually:

```bash
cd /Users/sawyer/gitSync/gpt-cursor-runner && ./cursor_runner_selfcheck_v1.sh
```

# Manual Fallback

To restart all systems manually:

```bash
cd /Users/sawyer/gitSync/gpt-cursor-runner && ./cursor_runner_selfcheck_v1.sh
```
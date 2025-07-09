# Cursor Development Guide

## 🚀 Quick Start

### Development Environment
- **Production Runner**: `https://runner.thoughtmarks.app` (port 5555)
- **Development Runner**: `https://runner-dev.thoughtmarks.app` (port 5051)
- **Dashboard**: `https://runner-dev.thoughtmarks.app/dashboard`
- **Health check**: `https://runner-dev.thoughtmarks.app/health`

### Starting the Development Server

```bash
# Start the Node.js server (Slack commands)
npm run dev

# Start the Python runner (GPT webhooks)
python3 -m gpt_cursor_runner.main
```

### Development URLs
- **Slack Commands**: `https://runner-dev.thoughtmarks.app/slack/commands`
- **Webhook Endpoint**: `https://runner-dev.thoughtmarks.app/webhook`
- **Dashboard**: `https://runner-dev.thoughtmarks.app/dashboard`
- **Health Check**: `https://runner-dev.thoughtmarks.app/health`

### Testing Commands

```bash
# Test Slack commands
node scripts/verify_slack_commands.js

# Test webhook endpoint
curl -X POST https://runner-dev.thoughtmarks.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "role": "system", "description": "Test"}'

# Test Slack ping
python3 scripts/test_slack_ping.py
```

## 🔧 Configuration

### Environment Variables
- `RUNNER_URL`: Production runner URL (`https://runner.thoughtmarks.app`)
- `RUNNER_DEV_URL`: Development runner URL (`https://runner-dev.thoughtmarks.app`)
- `ENDPOINT_URL`: Webhook endpoint for GPT
- `DASHBOARD_URL`: Dashboard URL for Slack commands

### Cloudflare Tunnel Configuration
- **Production**: `runner.thoughtmarks.app` → `http://localhost:5555`
- **Development**: `runner-dev.thoughtmarks.app` → `http://localhost:5051`

## 📊 Monitoring

### Health Checks
- **Health Check:** `https://runner-dev.thoughtmarks.app/health`
- **Dashboard:** `https://runner-dev.thoughtmarks.app/dashboard`

### Logs
- Event logs: `event-log.json`
- Runner state: `runner.state.json`
- Patch files: `patches/` directory

## 🚨 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 5555 and 5051 are available
2. **Tunnel issues**: Check Cloudflare tunnel status
3. **Slack commands**: Verify Slack app configuration

### Debug Mode
```bash
# Enable debug mode
export DEBUG_MODE=true
python3 -m gpt_cursor_runner.main
``` 
# GPT-Cursor Runner

A hybrid automation pipeline that enables GPT to control Cursor through structured instructional blocks and real-time patch orchestration.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Cloudflare Tunnel (replaces ngrok)

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp env.example .env
   ```

2. **Configure environment variables:**
   ```bash
   # Cloudflare Tunnel Configuration
   RUNNER_URL=https://runner.thoughtmarks.app
   RUNNER_DEV_URL=https://runner-dev.thoughtmarks.app
   
   # Webhook Endpoints
   ENDPOINT_URL=https://runner.thoughtmarks.app/webhook
   ENDPOINT_DEV_URL=https://runner-dev.thoughtmarks.app/webhook
   
   # Dashboard URLs
   DASHBOARD_URL=https://runner.thoughtmarks.app/dashboard
   DASHBOARD_DEV_URL=https://runner-dev.thoughtmarks.app/dashboard
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   npm install
   ```

### Development URLs
- **Production Runner**: `https://runner.thoughtmarks.app` (port 5555)
- **Development Runner**: `https://runner-dev.thoughtmarks.app` (port 5051)
- **Dashboard**: `https://runner-dev.thoughtmarks.app/dashboard`
- **Health Check**: `https://runner-dev.thoughtmarks.app/health`

### Starting the Servers

```bash
# Start Node.js server (Slack commands)
npm run dev

# Start Python runner (GPT webhooks)
python3 -m gpt_cursor_runner.main
```

## 🔧 Configuration

### Cloudflare Tunnel Setup
- **Production**: `runner.thoughtmarks.app` → `http://localhost:5555`
- **Development**: `runner-dev.thoughtmarks.app` → `http://localhost:5051`

### Slack App Configuration
1. Configure your Slack app with Request URLs pointing to:
   - `https://runner.thoughtmarks.app/slack/commands` (production)
   - `https://runner-dev.thoughtmarks.app/slack/commands` (development)

2. Set up OAuth redirect URLs:
   - `https://runner.thoughtmarks.app/slack/oauth/callback`
   - `https://runner-dev.thoughtmarks.app/slack/oauth/callback`

## 📊 Monitoring

### Health Checks
- **Production**: `https://runner.thoughtmarks.app/health`
- **Development**: `https://runner-dev.thoughtmarks.app/health`

### Event Logging
- Event logs: `event-log.json`
- Runner state: `runner.state.json`
- Patch files: `patches/` directory

## 🛠️ Development

### Testing
```bash
# Test Slack commands
node scripts/verify_slack_commands.js

# Test webhook endpoint
curl -X POST https://runner-dev.thoughtmarks.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "role": "system", "description": "Test"}'
```

### Debug Mode
```bash
export DEBUG_MODE=true
python3 -m gpt_cursor_runner.main
```

## 📚 Documentation

- [Development Guide](CURSOR_DEVELOPMENT_GUIDE.md)
- [Slack Commands](SLACK_COMMANDS_VERIFICATION.md)
- [Deployment Guide](FLYio_GPT_Cursor_Deployment_Summary.md)

## 🔄 Migration from ngrok

This project has migrated from ngrok to Cloudflare tunnels for better reliability and performance. All ngrok references have been replaced with Cloudflare tunnel URLs.
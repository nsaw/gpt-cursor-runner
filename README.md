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
   RUNNER_DEV_URL=https://runner.thoughtmarks.app
   
   # Webhook Endpoints
   ENDPOINT_URL=https://runner.thoughtmarks.app/webhook
   ENDPOINT_DEV_URL=https://runner.thoughtmarks.app/webhook
   
   # Dashboard URLs
   DASHBOARD_URL=https://runner.thoughtmarks.app/dashboard
   DASHBOARD_DEV_URL=https://runner.thoughtmarks.app/dashboard
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   npm install
   ```

### Development URLs
- **Production Runner**: `https://runner.thoughtmarks.app` (port 5555)
- **Development Runner**: `https://runner.thoughtmarks.app` (port 5051)
- **Dashboard**: `https://runner.thoughtmarks.app/dashboard`
- **Health Check**: `https://runner.thoughtmarks.app/health`

## Local Ghost Node Server (Required)

Ghost requires a local Node server on port **5555** for patch relay, GPT emergency commands, and patch validation support.

### Start it manually:
```bash
node server/index.js
```

### Endpoints:
- `POST /relay/receive` → Receives GPT instructions
- `POST /emergency/exec` → Secure shell runner (GPT only)

Set your GPT key as:
```bash
export GPT_EMERGENCY_KEY=yoursecret
```

### ⚠️ Fly.io optional
Fly is no longer required for Ghost daemon routing. All operations occur locally unless you deploy manually.

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
   - `https://runner.thoughtmarks.app/slack/commands` (development)

2. Set up OAuth redirect URLs:
   - `https://runner.thoughtmarks.app/slack/oauth/callback`
   - `https://runner.thoughtmarks.app/slack/oauth/callback`

## 📊 Monitoring

### Health Checks
- **Production**: `https://runner.thoughtmarks.app/health`
- **Development**: `https://runner.thoughtmarks.app/health`

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
curl -X POST https://runner.thoughtmarks.app/webhook \
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

## 🛰️ Patch Delivery System

Incoming patches via GPT → Ghost webhook hit: `POST http://localhost:5051/api/patches`

### Format:
Current GPT patch block is auto-adapted by server to match required schema for:
- `patch.id` → `blockId`
- `patch.patch` → full original patch
- `mutations` → parsed target file

### CYOPS to MAIN Handoff:
If patch is received by CYOPS relay, it is copied to MAIN patch path:
```bash
/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/
```

No patch is lost. All relay and delivery mechanisms are now symmetric.

## 🔄 Migration from ngrok

This project has migrated from ngrok to Cloudflare tunnels for better reliability and performance. All ngrok references have been replaced with Cloudflare tunnel URLs.
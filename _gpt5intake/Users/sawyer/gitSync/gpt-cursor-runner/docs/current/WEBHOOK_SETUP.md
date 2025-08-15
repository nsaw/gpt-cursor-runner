# Webhook-Thoughtmarks Setup Documentation

## Overview

The webhook-thoughtmarks system provides a dedicated tunnel and Slack integration for the `webhook-thoughtmarks.thoughtmarks.app` domain. This system includes:

- **Cloudflare Tunnel**: Dedicated tunnel with daemon monitoring
- **Slack Integration**: Full command interface via Slack
- **Health Monitoring**: Continuous health checks and status reporting
- **Unified Boot Integration**: Integrated with the main ghost boot system

## Components

### 1. Tunnel Configuration

**File**: `config/webhook-tunnel-config.yml`

```yaml
tunnel: 9401ee23-3a46-409b-b0e7-b035371afe32
credentials-file: ~/.cloudflared/9401ee23-3a46-409b-b0e7-b035371afe32.json

ingress:
  - hostname: webhook-thoughtmarks.thoughtmarks.app
    service: http://localhost:5051 # Python Ghost Runner (Slack commands)
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

### 2. Tunnel Daemon

**File**: `scripts/webhook-thoughtmarks-tunnel-daemon.sh`

**Features**:

- Continuous tunnel monitoring
- Automatic restart on failure
- Health check validation
- Restart limits and cooldowns
- Comprehensive logging

**Configuration**:

- Check interval: 30 seconds
- Max restarts: 5 attempts
- Restart cooldown: 60 seconds
- Health check URL: `https://webhook-thoughtmarks.thoughtmarks.app/health`

### 3. Dedicated Server

**File**: `webhook-thoughtmarks-server.js`

**Features**:

- Dedicated Express.js server on port 5051 (Python Ghost Runner)
- Slack command handling with signature verification
- Health check endpoint
- Environment-based configuration
- Comprehensive error handling

**Configuration**:

- Port: 5051 (Python Ghost Runner handles Slack commands)
- Environment file: `config/webhook-thoughtmarks.env`
- Health endpoint: `http://localhost:5051/health`
- Commands endpoint: `http://localhost:5051/webhook`

### 4. Slack Integration

**File**: `slack/webhook-thoughtmarks-commands.js` (legacy, now integrated into dedicated server)

**App Credentials**:

- App ID: `A09469H0C2K`
- Client ID: `9175632787408.9142323012087`
- **Sensitive credentials stored in**: `config/webhook-thoughtmarks.env` or 1Password CLI Vault 'SecretKeeper'
- **Environment variables**: `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_CLIENT_SECRET`, `SLACK_INCOMING_WEBHOOK`

## Available Slack Commands

### Core Control Commands

- `/dashboard` - View webhook-thoughtmarks dashboard
- `/status-webhook-thoughtmarks` - Check current status and health
- `/status-push` - Status pulse now
- `/restart-webhook-thoughtmarks` - Restart the service
- `/kill` - Force stop (emergency)
- `/toggle-webhook-thoughtmarks` - Toggle auto/manual mode
- `/webhook-thoughtmarks-lock` - Toggle lock state
- `/watchdog-ping` - Ping watchdog services

### Patch Management Commands

- `/patch-pass` - Pass next pending patches
- `/patch-revert` - Revert last applied patch
- `/patch-preview` - Preview pending patches
- `/approve-screenshot` - Approve screenshot-based patches
- `/revert-phase` - Revert to previous phase
- `/log-phase-status` - Log current phase status
- `/cursor-mode` - Switch Cursor operation modes

### Workflow Control Commands

- `/proceed` - Proceed with current operation
- `/again` - Retry last operation
- `/manual-revise` - Return to sender with notes
- `/manual-append` - Conditional approval with notes
- `/interrupt` - Stop current operation and resume

### Troubleshooting Commands

- `/troubleshoot` - Generate diagnostic block
- `/troubleshoot-oversight` - Diagnostics with human review
- `/send-with` - Request patch reissue with more info

### Information Commands

- `/roadmap` - Show project roadmap
- `/alert-webhook-thoughtmarks-crash` - Send crash alert

## Integration Points

### 1. Unified Ghost Boot Script

The webhook-thoughtmarks tunnel daemon is integrated into the unified ghost boot script (`scripts/unified-ghost-boot.sh`):

```bash
# Start webhook-thoughtmarks tunnel daemon (CRITICAL - Webhook Access)
echo "🛡️ Starting webhook-thoughtmarks tunnel daemon (CRITICAL - Webhook Access)..."
nohup bash scripts/webhook-thoughtmarks-tunnel-daemon.sh >> logs/webhook-tunnel-daemon.log 2>&1 &
echo $! > pids/webhook-tunnel-daemon.pid
```

### 2. Server Integration

The webhook-thoughtmarks service runs as a dedicated server (`webhook-thoughtmarks-server.js`):

```javascript
// Dedicated server on port 5432
const PORT = process.env.WEBHOOK_THOUGHTMARKS_PORT || 5432;
app.listen(PORT, () => {
  console.log(
    `[WEBHOOK-THOUGHTMARKS] Server listening on http://localhost:${PORT}`,
  );
});
```

### 3. Health Monitoring

The system includes comprehensive health monitoring:

- **Tunnel Status**: Continuous monitoring of cloudflared tunnel
- **Health Checks**: Regular validation of `https://webhook-thoughtmarks.thoughtmarks.app/health`
- **Process Monitoring**: PID file tracking and process validation
- **Logging**: Comprehensive logging to `logs/webhook-tunnel-daemon.log`

## Slack App Configuration

### App Manifest

The Slack app is configured via `config/slack-app-manifest-v2.yaml` with:

- **Display Name**: `gpt-cursor-webhook-thoughtmarks`
- **Description**: "cursor's boss"
- **Bot User**: `webhook-thoughtmarks`
- **Command URL**: `https://webhook-thoughtmarks.thoughtmarks.app/slack/commands`

### OAuth Configuration

```yaml
oauth_config:
  redirect_urls:
    - https://webhook-thoughtmarks.thoughtmarks.app/slack/oauth/callback
  scopes:
    bot:
      - commands
      - chat:write
      - users:read
      - app_mentions:read
      - incoming-webhook
      - channels:history
```

### Event Subscriptions

```yaml
settings:
  event_subscriptions:
    request_url: https://webhook-thoughtmarks.thoughtmarks.app/slack/events
    bot_events:
      - app_mention
      - message.channels
  interactivity:
    is_enabled: true
    request_url: https://webhook-thoughtmarks.thoughtmarks.app/slack/interactions
```

## Channel Integration

The app is configured to work in the `#cursor-thoughtmarks-native-build` channel:

- **Channel URL**: https://thoughtmarks.slack.com/archives/C0955JLTKJ4
- **App Installation**: Configured for the Thoughtmarks workspace

## Security Features

### 1. Request Verification

All Slack requests are verified using HMAC-SHA256 signature validation:

```javascript
function verifySlackSignature(req, res, next) {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const body = req.body;

  const baseString = `v0:${timestamp}:${JSON.stringify(body)}`;
  const expectedSignature =
    "v0=" +
    crypto
      .createHmac("sha256", SLACK_CONFIG.signingSecret)
      .update(baseString)
      .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid Slack signature" });
  }

  next();
}
```

### 2. Credential Management

All sensitive credentials are stored in `config/webhook-thoughtmarks.env` or the 1Password CLI Vault 'SecretKeeper'. The server loads credentials from environment variables:

```javascript
const SLACK_CONFIG = {
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  botToken: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  incomingWebhook: process.env.SLACK_INCOMING_WEBHOOK,
};
```

## Monitoring and Logging

### Log Files

- **Tunnel Daemon**: `logs/webhook-tunnel-daemon.log`
- **Server Logs**: `logs/relay.log`
- **Health Checks**: Integrated with unified monitoring

### Health Endpoints

- **Main Health**: `https://webhook-thoughtmarks.thoughtmarks.app/health`
- **Slack Commands**: `https://webhook-thoughtmarks.thoughtmarks.app/slack/commands`

### Status Monitoring

The system provides real-time status monitoring through:

1. **Tunnel Status**: Active connection monitoring
2. **Health Checks**: HTTP response validation
3. **Process Monitoring**: PID file tracking
4. **Slack Integration**: Command response validation

## Troubleshooting

### Common Issues

1. **Tunnel Not Running**
   - Check daemon logs: `tail -f logs/webhook-tunnel-daemon.log`
   - Verify credentials: `ls -la ~/.cloudflared/9401ee23-3a46-409b-b0e7-b035371afe32.json`
   - Restart daemon: `bash scripts/webhook-thoughtmarks-tunnel-daemon.sh`

2. **Slack Commands Not Responding**
   - Check server logs: `tail -f logs/relay.log`
   - Verify tunnel health: `curl https://webhook-thoughtmarks.thoughtmarks.app/health`
   - Check Slack app configuration in manifest

3. **Health Check Failures**
   - Verify local services on port 5432
   - Check tunnel connectivity
   - Review daemon restart logs

### Recovery Procedures

1. **Full System Restart**

   ```bash
   bash scripts/unified-ghost-boot.sh
   ```

2. **Tunnel Only Restart**

   ```bash
   pkill -f webhook-thoughtmarks-tunnel-daemon
   bash scripts/webhook-thoughtmarks-tunnel-daemon.sh
   ```

3. **Slack Integration Reset**
   - Verify app credentials in `config/webhook-thoughtmarks.env`
   - Check manifest configuration
   - Restart server: `node webhook-thoughtmarks-server.js`

## Future Enhancements

1. **Enhanced Monitoring**: Integration with unified monitoring dashboard
2. **Command History**: Logging and audit trail for all commands
3. **Advanced Security**: Additional authentication layers
4. **Performance Optimization**: Response time improvements
5. **Integration Expansion**: Additional Slack features and commands

---

**Last Updated**: 2025-07-30  
**Version**: 1.0.0  
**Status**: ✅ Active and Operational

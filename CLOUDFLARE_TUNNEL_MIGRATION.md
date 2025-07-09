# Cloudflare Tunnel Migration Guide

## 🔄 Migration Summary

This project has successfully migrated from ngrok to Cloudflare tunnels for improved reliability, performance, and security.

## 📊 New Tunnel Configuration

### Production Environment
- **URL**: `https://runner.thoughtmarks.app`
- **Local Port**: `5555`
- **Purpose**: Production Slack commands and webhooks

### Development Environment  
- **URL**: `https://runner-dev.thoughtmarks.app`
- **Local Port**: `5051`
- **Purpose**: Development and testing

## 🔧 Updated Configuration

##***REMOVED***
```bash
# Cloudflare Tunnel URLs
RUNNER_URL=https://runner.thoughtmarks.app
RUNNER_DEV_URL=https://runner-dev.thoughtmarks.app

# Webhook Endpoints
ENDPOINT_URL=https://runner.thoughtmarks.app/webhook
ENDPOINT_DEV_URL=https://runner-dev.thoughtmarks.app/webhook

# Dashboard URLs
DASHBOARD_URL=https://runner.thoughtmarks.app/dashboard
DASHBOARD_DEV_URL=https://runner-dev.thoughtmarks.app/dashboard
```

### Slack App Configuration
- **Request URLs**: `https://runner.thoughtmarks.app/slack/commands`
- **OAuth Redirect**: `https://runner.thoughtmarks.app/slack/oauth/callback`
- **Event Subscriptions**: `https://runner.thoughtmarks.app/slack/events`

## 🗑️ Removed Dependencies

### Dependencies Removed
- `pyngrok==7.2.11` - No longer needed
- ngrok authentication tokens
- ngrok API endpoints

### Files Updated
- `requirements.txt` - Removed pyngrok
- `setup.py` - Removed pyngrok dependency
- `pyproject.toml` - Removed pyngrok dependency
- `env.example` - Updated with Cloudflare tunnel URLs
- `README.md` - Updated documentation
- `CURSOR_DEVELOPMENT_GUIDE.md` - Updated development guide

## 📁 Updated Scripts

### Configuration Scripts
- `setup-real-env.sh` - Updated for Cloudflare tunnel URLs
- `deploy-to-fly.sh` - Removed ngrok configuration
- `gpt_cursor_runner/post_to_webhook.py` - Updated endpoint logic

### Test Scripts
- `scripts/test_slack_command.py` - Updated to use Cloudflare tunnel
- `scripts/test_slack_ping.py` - Updated to use Cloudflare tunnel
- `scripts/verify_slack_commands.js` - Updated to use Cloudflare tunnel

## 🚀 Benefits of Migration

### Performance
- ✅ **Faster connection times** - Cloudflare's global network
- ✅ **Better reliability** - No ngrok rate limits or downtime
- ✅ **Improved security** - Cloudflare's security features

### Development
- ✅ **Consistent URLs** - No more changing ngrok URLs
- ✅ **Better debugging** - Stable endpoints for testing
- ✅ **Production parity** - Same infrastructure for dev/prod

### Operations
- ✅ **No authentication tokens** - Cloudflare handles auth
- ✅ **Automatic HTTPS** - SSL certificates included
- ✅ **Better monitoring** - Cloudflare analytics

## 🔍 Verification Steps

### 1. Test Production URLs
```bash
# Test health endpoint
curl https://runner.thoughtmarks.app/health

# Test Slack commands
curl -X POST https://runner.thoughtmarks.app/slack/commands \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "command=/dashboard&user_id=U123&channel_id=C123"
```

### 2. Test Development URLs
```bash
# Test health endpoint
curl https://runner-dev.thoughtmarks.app/health

# Test webhook endpoint
curl -X POST https://runner-dev.thoughtmarks.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "role": "system", "description": "Test"}'
```

### 3. Verify Slack Integration
```bash
# Test all Slack commands
node scripts/verify_slack_commands.js
```

## 📋 Migration Checklist

- ✅ **Dependencies updated** - Removed pyngrok
- ✅ **Environment variables** - Updated with Cloudflare URLs
- ✅ **Documentation updated** - README and guides
- ✅ **Scripts updated** - Test and deployment scripts
- ✅ **Configuration files** - Updated with new URLs
- ✅ **Slack app configured** - Updated Request URLs
- ✅ **Health checks passing** - Both production and development
- ✅ **Webhook endpoints working** - GPT integration verified

## 🚨 Important Notes

### Port Configuration
- **Production**: Port 5555 → `https://runner.thoughtmarks.app`
- **Development**: Port 5051 → `https://runner-dev.thoughtmarks.app`

### Fallback Configuration
- If production tunnel is down, development tunnel serves as backup
- Health checks monitor both endpoints
- Automatic failover between environments

### Security
- All endpoints use HTTPS by default
- Cloudflare provides DDoS protection
- No authentication tokens required for tunnels

## 🔄 Rollback Plan

If needed, the project can be rolled back to ngrok by:

1. **Restore dependencies**:
   ```bash
   pip install pyngrok==7.2.11
   ```

2. **Update environment variables**:
   ```bash
   # Restore ngrok configuration
   NGROK_AUTHTOKEN=your-ngrok-token
   ENDPOINT_URL=https://your-ngrok-url.ngrok-free.app/webhook
   ```

3. **Update Slack app**:
   - Change Request URLs back to ngrok URLs
   - Update OAuth redirect URLs

4. **Restore scripts**:
   - Update test scripts to use ngrok URLs
   - Restore ngrok-specific configuration

## 📊 Migration Status

**Status**: ✅ **COMPLETE**

- **Date**: July 8, 2025
- **Version**: v2.0.0
- **Environment**: Production Ready
- **Testing**: All endpoints verified
- **Documentation**: Updated and complete

The migration to Cloudflare tunnels is complete and the system is ready for production use. 
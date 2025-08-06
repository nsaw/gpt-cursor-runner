# Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying the GPT-Cursor-Runner system to production environments.

## 📋 Prerequisites

### Required Accounts
- **Cloudflare Account** - For tunnel setup
- **Slack Workspace** - For integration
- **Fly.io Account** (optional) - For cloud deployment
- **OpenAI API Key** - For GPT integration

### Required Software
- **Node.js 18+**
- **Python 3.8+**
- **Cloudflare Tunnel CLI**
- **Git**

## 🔧 Environment Setup

### 1. Environment Variables
Create a `.env` file with the following variables:

```bash
# Cloudflare Tunnel URLs
RUNNER_URL=https://runner.thoughtmarks.app
ENDPOINT_URL=https://runner.thoughtmarks.app/webhook

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key

# System Configuration
DEBUG_MODE=false
LOG_LEVEL=info
```

### 2. Cloudflare Tunnel Setup
```bash
# Install Cloudflare Tunnel CLI
brew install cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create gpt-cursor-runner

# Configure tunnel
cloudflared tunnel route dns gpt-cursor-runner runner.thoughtmarks.app
```

### 3. Slack App Configuration
1. Create a new Slack app at https://api.slack.com/apps
2. Configure OAuth & Permissions:
   - Bot Token Scopes: `commands`, `chat:write`, `incoming-webhook`
   - User Token Scopes: `commands`
3. Configure Slash Commands:
   - Request URL: `https://runner.thoughtmarks.app/slack/commands`
4. Configure OAuth Redirect URLs:
   - `https://runner.thoughtmarks.app/slack/oauth/callback`

## 🏗️ Local Deployment

### 1. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install additional packages
pip install flake8 black autopep8 watchdog
```

### 2. Start the System
```bash
# Use unified boot script (recommended)
./scripts/core/unified-boot.sh

# Or start manually
npm run dev  # Node.js server
python3 -m gpt_cursor_runner.main  # Python runner
```

### 3. Verify Deployment
```bash
# Check health endpoints
curl http://localhost:5555/health
curl http://localhost:5053/health

# Test Slack commands
curl -X POST http://localhost:5555/slack/commands \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "command=/status-runner&user_id=U123&channel_id=C123"

# Test webhook endpoint
curl -X POST http://localhost:5555/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "role": "system", "description": "Test"}'
```

## ☁️ Cloud Deployment (Fly.io)

### 1. Install Fly CLI
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login
```

### 2. Deploy Application
```bash
# Deploy to Fly.io
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### 3. Configure Environment
```bash
# Set environment variables
fly secrets set SLACK_BOT_TOKEN=xoxb-your-token
fly secrets set SLACK_APP_TOKEN=xapp-your-token
fly secrets set OPENAI_API_KEY=your-openai-key

# Scale the application
fly scale count 1
```

## 🔍 Health Monitoring

### Health Check Endpoints
- **Main Server**: `https://runner.thoughtmarks.app/health`
- **Ghost Runner**: `http://localhost:5053/health`
- **Dashboard**: `https://runner.thoughtmarks.app/dashboard`

### Monitoring Commands
```bash
# Check system status
./scripts/core/unified-boot.sh status

# Monitor logs
tail -f logs/unified-ghost-boot-enhanced.log
tail -f logs/ghost-runner.log
tail -f logs/braun-daemon.log

# Check process status
ps aux | grep -E "(node|python)" | grep -v grep
```

### Slack Commands for Monitoring
- `/status-runner` - Check system status
- `/dashboard` - View system dashboard
- `/help` - List available commands

## 🔧 Configuration Management

### Port Configuration
| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **Node.js Server** | 5555 | Main API, Slack, Dashboard | ✅ Active |
| **Ghost Runner** | 5053 | Patch processing | ✅ Active |
| **Comprehensive Dashboard** | 3002 | System monitoring | ✅ Active |
| **Dual Monitor Server** | 8787 | Metrics collection | ✅ Active |

### External URLs
- **Production**: `https://runner.thoughtmarks.app`
- **Dashboard**: `https://runner.thoughtmarks.app/dashboard`
- **Health Check**: `https://runner.thoughtmarks.app/health`
- **Webhook**: `https://runner.thoughtmarks.app/webhook`

## 🛡️ Security Considerations

### Authentication
- **Slack OAuth** - Secure Slack integration
- **Webhook Signing** - Request validation
- **Environment Variables** - Secure configuration

### Data Protection
- **HTTPS/TLS** - Encrypted communication
- **Secure Storage** - Environment-based secrets
- **Access Control** - Role-based permissions

### Monitoring
- **Health Checks** - Regular endpoint validation
- **Log Monitoring** - Comprehensive activity tracking
- **Alert System** - Slack notifications for issues

## 🔄 Update and Maintenance

### System Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install
pip install -r requirements.txt

# Restart system
./scripts/core/unified-boot.sh restart
```

### Configuration Updates
```bash
# Update environment variables
nano .env

# Reload configuration
./scripts/core/unified-boot.sh restart
```

### Log Management
```bash
# Rotate logs
./scripts/log-rotation.sh

# Clean old logs
find logs/ -name "*.log" -mtime +7 -delete
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### 1. Port Conflicts
```bash
# Check port usage
lsof -i:5555,5053,3002,8787

# Kill conflicting processes
pkill -f "node.*server"
pkill -f "python.*main"
```

#### 2. Slack Integration Issues
- Verify Slack app configuration
- Check bot token and app token
- Ensure webhook URLs are correct
- Check Slack app permissions

#### 3. Cloudflare Tunnel Issues
```bash
# Check tunnel status
cloudflared tunnel list

# Restart tunnel
cloudflared tunnel stop gpt-cursor-runner
cloudflared tunnel start gpt-cursor-runner
```

#### 4. System Won't Start
```bash
# Check dependencies
node --version
python3 --version
npm list
pip list

# Check environment variables
echo $SLACK_BOT_TOKEN
echo $OPENAI_API_KEY

# Check file permissions
ls -la scripts/core/unified-boot.sh
chmod +x scripts/core/unified-boot.sh
```

### Emergency Procedures

#### System Recovery
```bash
# Stop all services
pkill -f "node.*server"
pkill -f "python.*main"

# Clear PID files
rm -f pids/*.pid

# Restart system
./scripts/core/unified-boot.sh
```

#### Rollback Deployment
```bash
# Revert to previous version
git checkout HEAD~1

# Restart system
./scripts/core/unified-boot.sh restart
```

## 📊 Performance Optimization

### Resource Limits
- **Memory**: 512MB per daemon
- **CPU**: 80% per daemon
- **Restart Limits**: 5 attempts per 5 minutes

### Monitoring Metrics
- **Response Time**: < 1000ms for API calls
- **Uptime**: Target > 99.5%
- **Recovery Time**: < 30 seconds

### Scaling Considerations
- **Horizontal Scaling**: Multiple instances
- **Load Balancing**: Intelligent traffic distribution
- **Caching**: Redis integration (future)
- **Database**: PostgreSQL integration (future)

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Cloudflare tunnel setup
- [ ] Slack app configured
- [ ] Dependencies installed
- [ ] File permissions set

### Deployment
- [ ] System starts successfully
- [ ] Health checks pass
- [ ] Slack commands work
- [ ] Webhook endpoints respond
- [ ] Dashboard accessible

### Post-Deployment
- [ ] Monitoring active
- [ ] Logs being generated
- [ ] Alerts configured
- [ ] Backup systems active
- [ ] Documentation updated

---

**Deployment Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-07-31  
**Version**: 3.4.3 
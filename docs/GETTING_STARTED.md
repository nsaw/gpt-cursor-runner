# Getting Started with GPT-Cursor-Runner

Welcome to the GPT-Cursor-Runner project! This guide will help you get up and running quickly.

## 🎯 What is GPT-Cursor-Runner?

GPT-Cursor-Runner is a comprehensive automation system that enables:
- **Remote control of Cursor agents** through GPT-generated patches
- **Slack integration** with 25+ slash commands for remote management
- **Webhook processing** for GPT communication
- **Auto-organization** of documentation and patches
- **Self-monitoring** and auto-recovery systems

## 📋 Prerequisites

### Required Software
- **Node.js 18+** - For the main server and Slack integration
- **Python 3.8+** - For patch processing and daemons
- **Git** - For version control
- **Cloudflare Tunnel** - For external access (replaces ngrok)

### Required Accounts
- **Slack Workspace** - For integration and commands
- **Cloudflare Account** - For tunnel setup
- **Fly.io Account** (optional) - For cloud deployment

## 🚀 Quick Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd gpt-cursor-runner
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install additional Python packages
pip install flake8 black autopep8 watchdog
```

### 3. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

**Essential Environment Variables:**
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

### 4. Start the System
```bash
# Use the unified boot script (recommended)
./scripts/core/unified-boot.sh

# Or start manually
npm run dev  # Node.js server
python3 -m gpt_cursor_runner.main  # Python runner
```

## 🔧 First Steps

### 1. Verify System Health
```bash
# Check system status
curl http://localhost:5555/health

# Check Slack integration
curl http://localhost:5555/slack/commands

# Check webhook endpoint
curl -X POST http://localhost:5555/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "role": "system", "description": "Test"}'
```

### 2. Test Slack Commands
In your Slack workspace, try these commands:
- `/status-runner` - Check system status
- `/dashboard` - View system dashboard
- `/help` - List available commands

### 3. Test Webhook Integration
```bash
# Test webhook with a sample patch
curl -X POST http://localhost:5555/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-patch-001",
    "role": "command_patch",
    "description": "Test patch for new developer",
    "target_file": "test.txt",
    "patch": "Hello, World!"
  }'
```

## 📚 Understanding the Architecture

### Core Components
1. **Ghost Runner** - Main patch processing system
2. **BRAUN Daemon** - Enhanced patch processing with self-monitoring
3. **Enhanced Document Daemon** - Auto-organization and documentation
4. **Watchdog System** - Monitoring and auto-recovery
5. **Slack Integration** - Remote control interface
6. **Webhook System** - GPT communication layer

### Data Flow
```
GPT → Webhook → Ghost Bridge → Patch Processing → Agent Execution → Summary → Feedback
```

### Port Configuration
- **5555** - Main Node.js server (Slack commands, API)
- **5053** - Ghost Runner (patch processing)
- **3002** - Comprehensive Dashboard
- **8787** - Dual Monitor Server

## 🛠️ Development Workflow

### 1. Local Development
```bash
# Start development mode
export DEBUG_MODE=true
./scripts/core/unified-boot.sh

# Monitor logs
tail -f logs/ghost-runner.log
tail -f logs/braun-daemon.log
```

### 2. Testing
```bash
# Test Slack commands
node scripts/verify_slack_commands.js

# Test webhook endpoints
curl -X POST http://localhost:5555/webhook \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "role": "system", "description": "Test"}'

# Run system tests
python3 -m pytest tests/
```

### 3. Debugging
```bash
# Check system status
./scripts/core/unified-boot.sh status

# View recent logs
tail -n 50 logs/unified-ghost-boot-enhanced.log

# Check process status
ps aux | grep -E "(node|python)" | grep -v grep
```

## 🔍 Monitoring and Health Checks

### System Health
- **Health Endpoint**: `http://localhost:5555/health`
- **Dashboard**: `http://localhost:3002`
- **Slack Command**: `/status-runner`

### Log Files
- **Main Logs**: `logs/` directory
- **Ghost Runner**: `logs/ghost-runner.log`
- **BRAUN Daemon**: `logs/braun-daemon.log`
- **Enhanced Document Daemon**: `logs/enhanced-doc-daemon.log`

### Watchdog System
The system includes comprehensive monitoring:
- **Process Monitoring** - Auto-restart failed services
- **Health Checks** - Regular endpoint validation
- **Resource Monitoring** - CPU, memory, disk usage
- **Alert System** - Slack notifications for issues

## 🚨 Common Issues and Solutions

### 1. Port Conflicts
```bash
# Check what's using the ports
lsof -i:5555,5053,3002,8787

# Kill conflicting processes
pkill -f "node.*server"
pkill -f "python.*main"
```

### 2. Slack Commands Not Working
- Verify Slack app configuration
- Check bot token and app token
- Ensure webhook URLs are correct
- Check Slack app permissions

### 3. Webhook Not Receiving
- Verify Cloudflare tunnel is running
- Check webhook endpoint configuration
- Validate request format and headers
- Check authentication tokens

### 4. System Won't Start
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

## 📖 Next Steps

### 1. Read the Documentation
- **[Architecture Overview](ARCHITECTURE.md)** - Understand the system design
- **[API Reference](API_REFERENCE.md)** - Learn about available endpoints
- **[Slack Commands](guides/SLACK_COMMANDS.md)** - Master the Slack interface

### 2. Explore the Codebase
- **`scripts/`** - System scripts and utilities
- **`server/`** - Node.js server implementation
- **`gpt_cursor_runner/`** - Python runner implementation
- **`docs/`** - Complete documentation

### 3. Join the Development
- Check [Current Systems Configuration](current/SYSTEMS_CONFIGURATION.md) for status
- Review [Troubleshooting Guide](guides/TROUBLESHOOTING.md) for common issues
- Read [Changelog](CHANGELOG.md) for recent updates

## 🆘 Getting Help

### Documentation
- **Main Documentation**: [README.md](README.md)
- **Current Status**: [Systems Configuration](current/SYSTEMS_CONFIGURATION.md)
- **Troubleshooting**: [Troubleshooting Guide](guides/TROUBLESHOOTING.md)

### Slack Commands for Help
- `/status-runner` - Check system status
- `/help` - List available commands
- `/dashboard` - View system dashboard

### Logs and Debugging
- Check `logs/` directory for detailed error information
- Use `DEBUG_MODE=true` for verbose logging
- Monitor watchdog logs for system health

---

**Welcome to the team!** 🎉

The GPT-Cursor-Runner system is designed to be robust and self-maintaining. Once you're comfortable with the basics, you'll find it's a powerful tool for remote automation and development.

**Next**: Read the [Architecture Overview](ARCHITECTURE.md) to understand how everything works together. 
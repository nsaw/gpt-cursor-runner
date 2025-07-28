# ThoughtPilot-AI Pro Tier

## Overview
ThoughtPilot-AI Pro Tier extends the Free Tier with Slack integration and hosted dashboard capabilities. Perfect for teams that need collaborative patch approval workflows.

## Features

### Free Tier Features
- **CLI Interface**: Run GPT patches directly from your terminal
- **Local Patches**: Execute patches without external dependencies
- **Offline Support**: Work completely offline with local models

### Pro Tier Additions
- **Slack Integration**: `/approve` and `/revert` commands for patch approval
- **Hosted Dashboard**: Web-based dashboard for patch management
- **Patch Logs**: Comprehensive logging for local and Slack runs
- **Webhook Support**: Real-time notifications and integrations

## Quick Start

### Installation
```bash
# Install Python dependencies
pip install -e .

# Install Node.js dependencies
npm install
```

### Configuration
1. Copy environment template:
```bash
cp env.example .env
```

2. Configure Slack integration:
```bash
# Add to .env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
```

3. Deploy to hosting platform:
```bash
# Deploy to Fly.io
fly deploy
```

## Slack Commands

### Patch Management
```bash
/approve [patch-id]     # Approve a pending patch
/revert [patch-id]      # Revert an applied patch
/status-runner          # Check runner status
/dashboard              # Open web dashboard
```

### Runner Control
```bash
/pause-runner           # Pause the runner
/proceed                # Resume the runner
/restart-runner         # Restart the runner
/kill                   # Stop the runner
```

## Dashboard Features
- Real-time patch status
- Approval queue management
- Patch history and logs
- Team activity monitoring
- Performance metrics

## File Structure
```
Pro/
├── gpt_cursor_runner/     # Core CLI package
├── handlers/              # Slack command handlers
├── routes/                # API routes
├── middleware/            # Request middleware
├── utils/                 # Utility functions
├── commands/              # Slack command definitions
├── tests/                 # Test suite
├── package.json           # Node.js dependencies
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container configuration
├── fly.toml              # Fly.io deployment
└── README.md             # This file
```

## Deployment

### Local Development
```bash
# Start Python server
python -m gpt_cursor_runner.main

# Start Node.js server
npm start
```

### Production Deployment
```bash
# Deploy to Fly.io
fly deploy

# Or use Docker
docker build -t thoughtpilot-pro .
docker run -p 3000:3000 thoughtpilot-pro
```

## Limitations
- Single-user dashboard
- Basic audit logs
- No CI/CD integration
- No multi-user support
- No airgapped deployment

## Support
For support, visit: https://thoughtmarks.app

## License
MIT License - see LICENSE file for details.

---

**Upgrade to Team** for multi-user support and CI/CD integration! 
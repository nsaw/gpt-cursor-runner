# ThoughtPilot-AI Team Tier

## Overview
ThoughtPilot-AI Team Tier extends Pro Tier with multi-user support, advanced audit logs, and CI/CD integration. Perfect for development teams that need comprehensive patch management and traceability.

## Features

### Pro Tier Features
- **CLI Interface**: Run GPT patches directly from your terminal
- **Local Patches**: Execute patches without external dependencies
- **Slack Integration**: `/approve` and `/revert` commands for patch approval
- **Hosted Dashboard**: Web-based dashboard for patch management
- **Patch Logs**: Comprehensive logging for local and Slack runs

### Team Tier Additions
- **Multi-User Support**: Team collaboration with role-based access
- **Patch History**: Complete patch history with rollback capabilities
- **CI/CD Integration**: Trigger deployments from Slack commands
- **Advanced Audit Logs**: Full traceability with detailed audit trails
- **Team Dashboard**: Multi-user dashboard with team analytics
- **Rate Limiting**: Advanced rate limiting and throttling
- **Patch Classification**: AI-powered patch categorization
- **Metrics & Analytics**: Comprehensive performance metrics

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

2. Configure team settings:
```bash
# Add to .env
TEAM_MODE=true
MULTI_USER=true
AUDIT_LOGS=true
CI_CD_INTEGRATION=true
RATE_LIMIT_ENABLED=true
```

3. Set up team roles:
```bash
# Configure team members and roles
python -m gpt_cursor_runner.config_manager --setup-team
```

## Team Features

### Multi-User Dashboard
- Role-based access control
- Team activity monitoring
- Individual user analytics
- Team performance metrics

### CI/CD Integration
```bash
# Slack commands for CI/CD
/deploy [environment]     # Trigger deployment
/rollback [version]       # Rollback to previous version
/status-deploy            # Check deployment status
/trigger-build            # Trigger CI build
```

### Advanced Audit Logs
- User action tracking
- Patch approval history
- Deployment audit trails
- Security event logging
- Compliance reporting

### Patch Management
```bash
# Advanced patch commands
/patch-history [user]     # View user's patch history
/patch-rollback [id]      # Rollback specific patch
/patch-classify [id]      # Classify patch type
/patch-metrics [period]   # View patch metrics
```

## File Structure
```
Team/
├── gpt_cursor_runner/     # Core CLI package
├── handlers/              # Slack command handlers
├── routes/                # API routes
├── middleware/            # Request middleware
├── utils/                 # Utility functions
├── commands/              # Slack command definitions
├── scripts/               # Automation scripts
├── assets/                # Static assets
├── dashboard.py           # Dashboard application
├── event_logger.py        # Advanced logging
├── event_viewer.py        # Log viewer
├── patch_metrics.py       # Metrics collection
├── patch_reverter.py      # Rollback functionality
├── patch_classifier.py    # AI classification
├── rate_limiter.py        # Rate limiting
├── tests/                 # Test suite
├── package.json           # Node.js dependencies
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container configuration
├── fly.toml              # Fly.io deployment
└── README.md             # This file
```

## Team Management

### User Roles
- **Admin**: Full system access
- **Manager**: Team management and approvals
- **Developer**: Patch creation and submission
- **Reviewer**: Patch review and approval
- **Viewer**: Read-only access

### Team Analytics
- Patch success rates
- User productivity metrics
- Team collaboration stats
- Deployment frequency
- Error rate tracking

## Deployment

### Local Development
```bash
# Start with team mode
python -m gpt_cursor_runner.main --team-mode

# Start dashboard
python dashboard.py

# Start Node.js server
npm start
```

### Production Deployment
```bash
# Deploy with team features
fly deploy --team-mode

# Or use Docker
docker build -t thoughtpilot-team .
docker run -p 3000:3000 -e TEAM_MODE=true thoughtpilot-team
```

## Limitations
- No airgapped deployment
- No GitHub Enterprise support
- No custom GPT endpoints
- No dedicated support

## Support
For support, visit: https://thoughtmarks.app

## License
MIT License - see LICENSE file for details.

---

**Upgrade to Enterprise** for airgapped deployment and custom GPT endpoints! 
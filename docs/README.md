# GPT-Cursor-Runner Documentation

Welcome to the GPT-Cursor-Runner project! This is a comprehensive automation system for remote control of Cursor agents through GPT-generated patches.

## 🚀 Quick Start

### For New Developers

- **[Getting Started](GETTING_STARTED.md)** - Complete onboarding guide
- **[Architecture Overview](ARCHITECTURE.md)** - System architecture and components
- **[Development Setup](guides/DEVELOPMENT_SETUP.md)** - Local development environment

### For Deployment

- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Current Systems](current/SYSTEMS_CONFIGURATION.md)** - Current system status and configuration
- **[Troubleshooting](guides/TROUBLESHOOTING.md)** - Common issues and solutions

## 📚 Current System Documentation

### Core Systems

- **[Systems Configuration](current/SYSTEMS_CONFIGURATION.md)** - Current system status, ports, and services
- **[Slack Integration](current/SLACK_INTEGRATION.md)** - Slack setup, commands, and integration
- **[Webhook Setup](current/WEBHOOK_SETUP.md)** - Webhook configuration and endpoints
- **[Watchdog System](current/WATCHDOG_SYSTEM.md)** - Monitoring and auto-recovery system

### Enhanced Features

- **[Enhanced Document Daemon](current/ENHANCED_DOCUMENT_DAEMON.md)** - Auto-organization and documentation
- **[Bridge Integration](architecture/COMPONENTS.md#bridge-integration)** - Ghost Bridge communication layer

## 🔧 Guides and References

### Development

- **[Development Setup](guides/DEVELOPMENT_SETUP.md)** - Local development environment setup
- **[API Reference](API_REFERENCE.md)** - API endpoints and webhook specifications
- **[Slack Commands](guides/SLACK_COMMANDS.md)** - Complete Slack command reference

### Operations

- **[Deployment Guide](guides/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
- **[Troubleshooting](guides/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Monitoring](guides/MONITORING.md)** - System monitoring and health checks

## 🏗️ Architecture

### System Overview

- **[Architecture Overview](ARCHITECTURE.md)** - High-level system architecture
- **[Components](architecture/COMPONENTS.md)** - Detailed component descriptions
- **[Data Flow](architecture/DATA_FLOW.md)** - System data flow and communication
- **[Security](architecture/SECURITY.md)** - Security considerations and best practices

### API Documentation

- **[API Endpoints](api/ENDPOINTS.md)** - REST API endpoint reference
- **[Webhooks](api/WEBHOOKS.md)** - Webhook specifications and payloads
- **[Slack API](api/SLACK_API.md)** - Slack API integration details

## 📋 Project Information

- **[Changelog](CHANGELOG.md)** - Version history and updates
- **[Development Rules](rules/VALIDATION.md)** - Code validation and standards
- **[Archive](archive/README.md)** - Historical documentation and completed phases

## 🎯 Current Status

### ✅ Operational Systems

- **Ghost Runner** - Main patch processing system
- **BRAUN Daemon** - Enhanced patch processing with self-monitoring
- **Enhanced Document Daemon** - Auto-organization and documentation
- **Watchdog System** - Comprehensive monitoring and auto-recovery
- **Slack Integration** - 25+ slash commands for remote control
- **Webhook System** - GPT integration and patch reception

### 🔄 Recent Updates

- **Enhanced Document Daemon** - Auto-archives summaries after 2 days, generates patch manifests
- **Unified Boot System** - Enhanced startup with port management and service verification
- **Slack App Integration** - Webhook-thoughtmarks system with OAuth flow
- **File Organization** - Scripts and root directory cleanup and organization

## 🚨 Quick Troubleshooting

### Common Issues

1. **System won't start** → Check [Troubleshooting Guide](guides/TROUBLESHOOTING.md)
2. **Slack commands not working** → Check [Slack Integration](current/SLACK_INTEGRATION.md)
3. **Webhook not receiving** → Check [Webhook Setup](current/WEBHOOK_SETUP.md)
4. **Port conflicts** → Check [Systems Configuration](current/SYSTEMS_CONFIGURATION.md)

### Emergency Contacts

- **System Status**: Check [Current Systems Configuration](current/SYSTEMS_CONFIGURATION.md)
- **Health Checks**: Use Slack command `/status-runner`
- **Logs**: Check `logs/` directory for detailed error information

## 📞 Support

### For New Developers

1. Start with [Getting Started](GETTING_STARTED.md)
2. Review [Architecture Overview](ARCHITECTURE.md)
3. Set up [Development Environment](guides/DEVELOPMENT_SETUP.md)
4. Test with [Slack Commands](guides/SLACK_COMMANDS.md)

### For Current Developers

1. Check [Current Systems Configuration](current/SYSTEMS_CONFIGURATION.md) for status
2. Use [Troubleshooting Guide](guides/TROUBLESHOOTING.md) for issues
3. Review [API Reference](API_REFERENCE.md) for integration
4. Check [Changelog](CHANGELOG.md) for recent updates

---

**Last Updated**: 2025-07-31  
**Version**: 3.4.3  
**Status**: ✅ **PRODUCTION READY**  
**Documentation**: 🔄 **UNDER REORGANIZATION**

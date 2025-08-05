# Scripts Directory Organization

This directory contains all scripts for the GPT-Cursor-Runner system, organized by functionality.

## 📁 Directory Structure

### **Core Scripts** (`core/`)
Essential system scripts that handle the main functionality:
- `unified-boot.sh` - Main system boot script with enhanced port management
- `ghost-runner.js` - Ghost runner service for CYOPS patch processing
- `patch-executor-loop.js` - Patch processing and execution
- `command-queue-daemon.sh` - Command queue management
- `comprehensive-dashboard.js` - System monitoring dashboard
- `ghost-bridge.js` - Ghost bridge service
- `patch-delivery-tracker.js` - Patch delivery tracking
- `gpt-patch-interface.js` - GPT patch interface

### **Slack Integration** (`slack/`)
Slack app creation, testing, and management scripts:
- `create-new-slack-app.js` - Create new Slack app programmatically
- `setup-new-slack-app-guide.js` - Manual setup guide
- `test-new-slack-app.js` - Test new Slack app functionality
- `update-env-with-new-app.js` - Update environment with new app credentials
- `install-webhook-thoughtmarks.js` - Install webhook-thoughtmarks
- `test-webhook-thoughtmarks-direct.js` - Test webhook functionality
- `reactivate-slack-app.md` - Slack app reactivation guide
- Various OAuth and testing scripts

### **TypeScript Fixes** (`typescript-fixes/`)
Scripts for fixing TypeScript errors and related documentation:
- Multiple `fix-*.js` scripts for error resolution
- TypeScript fix summaries and documentation
- Error reduction and validation scripts

### **Testing** (`testing/`)
System testing and validation scripts:
- `test-enhanced-system.js` - Enhanced system testing
- `test-advanced-systems.js` - Advanced system testing
- Various validation scripts

### **Maintenance** (`maintenance/`)
System maintenance and diagnostic scripts:
- `tunnel-tracer-diagnostic.sh` - Tunnel diagnostic tools
- System health audit scripts
- Cache clearing and cleanup scripts

### **Deployment** (`deployment/`)
Deployment and infrastructure scripts:
- `enterprise-deployment.sh` - Enterprise deployment
- `launch-tunnel-webhook.sh` - Tunnel webhook launching
- `webhook-resume-delivery.sh` - Webhook delivery resumption

### **Legacy** (`legacy/`)
Obsolete and deprecated scripts:
- `unified-ghost-boot.sh` - Old boot script (replaced by unified-boot.sh)
- `boot-all-systems.sh` - Old system boot script
- `boot-flask-daemon.sh` - Old Flask daemon script
- Various deprecated Slack app scripts

### **Existing Subdirectories**
- `watchdogs/` - System watchdog scripts
- `monitor/` - System monitoring scripts
- `launchers/` - Service launcher scripts
- `environments/` - Environment management scripts
- `analytics/` - Analytics and metrics scripts
- `load-balancing/` - Load balancing scripts
- `performance/` - Performance monitoring scripts
- `relay/` - Relay service scripts
- `rollback/` - System rollback scripts
- `validators/` - Validation scripts
- `doc/` - Documentation scripts
- `diagnostics/` - Diagnostic scripts
- `hooks/` - Hook scripts
- `ml/` - Machine learning scripts
- `watchdog/` - Additional watchdog scripts
- `viewer/` - Viewer scripts
- `system/` - System management scripts
- `tunnel/` - Tunnel management scripts
- `ghost/` - Ghost service scripts
- `compliance/` - Compliance scripts
- `cli/` - Command line interface scripts
- `status/` - Status monitoring scripts
- `utils/` - Utility scripts

## 🚀 Usage

### **Starting the System**
```bash
# Use the enhanced unified boot script
./scripts/core/unified-boot.sh
```

### **Slack App Management**
```bash
# Create a new Slack app
node scripts/slack/create-new-slack-app.js

# Test Slack app functionality
node scripts/slack/test-new-slack-app.js
```

### **TypeScript Error Fixes**
```bash
# Run TypeScript error fixes
node scripts/typescript-fixes/fix-typescript-errors.js
```

### **System Testing**
```bash
# Run enhanced system tests
node scripts/testing/test-enhanced-system.js
```

## 📋 Notes

- **Core scripts** are the most important and frequently used
- **Legacy scripts** are kept for reference but should not be used
- **Slack scripts** are for Slack app management and testing
- **TypeScript fixes** are for resolving TypeScript compilation errors
- **Testing scripts** are for system validation and testing
- **Maintenance scripts** are for system upkeep and diagnostics
- **Deployment scripts** are for infrastructure and deployment

## 🔧 Maintenance

When adding new scripts:
1. **Categorize** them into the appropriate subdirectory
2. **Update** this README with new script descriptions
3. **Test** the scripts to ensure they work from their new location
4. **Update** any hardcoded references to script paths 
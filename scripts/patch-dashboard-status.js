#!/usr/bin/env node

/**
 * Dashboard Status Patch Script
 * Adds plist status tab and functionality to the dashboard
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DashboardPatcher {
  constructor() {
    this.operationUuid = crypto.randomUUID();
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${this.operationUuid}] ${message}`;
    console.log(logEntry);
  }

  async addPlistTab() {
    this.log('📋 Adding plist status tab to dashboard');
        
    try {
      // Check if dashboard files exist
      const dashboardPath = path.join(this.projectRoot, 'server', 'handlers');
      if (!fs.existsSync(dashboardPath)) {
        this.log('ERROR', '❌ Dashboard handlers directory not found');
        return false;
      }

      // Verify plist handler exists
      const plistHandlerPath = path.join(dashboardPath, 'handlePlistStatus.js');
      if (!fs.existsSync(plistHandlerPath)) {
        this.log('ERROR', '❌ Plist status handler not found');
        return false;
      }

      // Check if routes need to be updated
      const routesPath = path.join(this.projectRoot, 'server', 'routes', 'slack.js');
      if (fs.existsSync(routesPath)) {
        this.log('INFO', '📝 Updating Slack routes to include plist status');
                
        let routesContent = fs.readFileSync(routesPath, 'utf8');
                
        // Check if plist route already exists
        if (!routesContent.includes('/plist-status')) {
          // Add plist status route
          const plistRoute = `
// Plist status route
app.post('/plist-status', async (req, res) => {
    const { handlePlistStatus } = require('../handlers/handlePlistStatus');
    await handlePlistStatus(req, res);
});`;
                    
          // Insert before the catch-all route
          routesContent = routesContent.replace(
            /app\.post\('\/.*', async \(req, res\) => {/,
            `${plistRoute}\n\n$&`
          );
                    
          fs.writeFileSync(routesPath, routesContent);
          this.log('INFO', '✅ Plist status route added');
        } else {
          this.log('INFO', '✅ Plist status route already exists');
        }
      }

      // Create dashboard API endpoint
      const apiPath = path.join(this.projectRoot, 'server', 'routes', 'api.js');
      if (!fs.existsSync(apiPath)) {
        this.log('INFO', '📝 Creating API routes file');
        const apiContent = `const express = require('express');
const router = express.Router();
const { handlePlistStatus } = require('../handlers/handlePlistStatus');

// Plist status API endpoint
router.get('/plist-status', async (req, res) => {
    await handlePlistStatus(req, res);
});

module.exports = router;`;
                
        fs.writeFileSync(apiPath, apiContent);
        this.log('INFO', '✅ API routes file created');
      }

      this.log('INFO', '✅ Plist status tab functionality added');
      return true;

    } catch (error) {
      this.log('ERROR', `❌ Error adding plist tab: ${error.message}`);
      return false;
    }
  }

  async refreshManifest() {
    this.log('INFO', '🔄 Refreshing Slack app manifest');
        
    try {
      // Check if manifest exists
      const manifestPath = path.join(this.projectRoot, 'slack-app-manifest-v2.yaml');
      if (!fs.existsSync(manifestPath)) {
        this.log('WARN', '⚠️  Slack manifest not found');
        return false;
      }

      // Read current manifest
      let manifestContent = fs.readFileSync(manifestPath, 'utf8');
            
      // Check if plist-status command already exists
      if (!manifestContent.includes('plist-status')) {
        this.log('INFO', '📝 Adding plist-status command to manifest');
                
        // Add the command to the manifest
        const plistCommand = `  - command: /plist-status
    description: Check launchd .plist status for watchdog services
    usage_hint: "/plist-status"`;
                
        // Insert after existing commands
        manifestContent = manifestContent.replace(
          /(commands:)/,
          `$1\n${plistCommand}`
        );
                
        fs.writeFileSync(manifestPath, manifestContent);
        this.log('INFO', '✅ Plist status command added to manifest');
      } else {
        this.log('INFO', '✅ Plist status command already exists in manifest');
      }

      return true;

    } catch (error) {
      this.log('ERROR', `❌ Error refreshing manifest: ${error.message}`);
      return false;
    }
  }

  async run() {
    this.log('🚀 Starting dashboard patch operation');
        
    const results = {
      plistTab: await this.addPlistTab(),
      manifest: await this.refreshManifest()
    };

    const endTime = Date.now();
    const duration = endTime - this.startTime;
        
    this.log(`🏁 Dashboard patch completed in ${duration}ms`);
    this.log(`📊 Results: ${JSON.stringify(results, null, 2)}`);
        
    return results;
  }
}

// Main execution
if (require.main === module) {
  const patcher = new DashboardPatcher();
    
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
    
  switch (command) {
  case '--add-plist-tab':
    patcher.addPlistTab().then(success => {
      process.exit(success ? 0 : 1);
    });
    break;
  case '--refresh-manifest':
    patcher.refreshManifest().then(success => {
      process.exit(success ? 0 : 1);
    });
    break;
  default:
    patcher.run().then(results => {
      const allSuccess = Object.values(results).every(Boolean);
      process.exit(allSuccess ? 0 : 1);
    });
  }
}

module.exports = DashboardPatcher; 